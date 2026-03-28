'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const MAX_CROP_SIZE = 320
const OUTPUT_SIZE = 512
const DEFAULT_PREVIEW_SIZE = 128

type Offset = {
  x: number
  y: number
}

type AvatarCropDialogProps = {
  open: boolean
  imageSrc: string | null
  fileName: string
  onClose: () => void
  onComplete: (file: File) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function replaceFileExtension(fileName: string, extension: string) {
  const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName
  return `${baseName || 'avatar'}${extension}`
}

export default function AvatarCropDialog({
  open,
  imageSrc,
  fileName,
  onClose,
  onComplete,
}: AvatarCropDialogProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const cropFrameRef = useRef<HTMLDivElement | null>(null)
  const previewFrameRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: Offset
  } | null>(null)

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [cropSize, setCropSize] = useState(MAX_CROP_SIZE)
  const [previewSize, setPreviewSize] = useState(DEFAULT_PREVIEW_SIZE)

  useEffect(() => {
    if (!open || !imageSrc) {
      return
    }

    const probe = new Image()
    probe.onload = () => {
      setImageSize({
        width: probe.naturalWidth || probe.width,
        height: probe.naturalHeight || probe.height,
      })
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    probe.src = imageSrc
  }, [imageSrc, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const updateSizes = () => {
      const nextCropSize = cropFrameRef.current?.getBoundingClientRect().width ?? MAX_CROP_SIZE
      const nextPreviewSize =
        previewFrameRef.current?.getBoundingClientRect().width ?? DEFAULT_PREVIEW_SIZE

      setCropSize(
        nextCropSize > 0 ? Math.min(MAX_CROP_SIZE, Math.round(nextCropSize)) : MAX_CROP_SIZE,
      )
      setPreviewSize(
        nextPreviewSize > 0
          ? Math.min(DEFAULT_PREVIEW_SIZE, Math.round(nextPreviewSize))
          : DEFAULT_PREVIEW_SIZE,
      )
    }

    updateSizes()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSizes) : null

    if (resizeObserver) {
      if (cropFrameRef.current) {
        resizeObserver.observe(cropFrameRef.current)
      }
      if (previewFrameRef.current) {
        resizeObserver.observe(previewFrameRef.current)
      }
    } else {
      window.addEventListener('resize', updateSizes)
    }

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateSizes)
    }
  }, [open])

  const metrics = useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return {
        scale: 1,
        width: 0,
        height: 0,
        boundsX: 0,
        boundsY: 0,
      }
    }

    const baseScale = Math.max(cropSize / imageSize.width, cropSize / imageSize.height)
    const scale = baseScale * zoom
    const width = imageSize.width * scale
    const height = imageSize.height * scale

    return {
      scale,
      width,
      height,
      boundsX: Math.max(0, (width - cropSize) / 2),
      boundsY: Math.max(0, (height - cropSize) / 2),
    }
  }, [cropSize, imageSize.height, imageSize.width, zoom])

  const clampedOffset = useMemo(
    () => ({
      x: clamp(offset.x, -metrics.boundsX, metrics.boundsX),
      y: clamp(offset.y, -metrics.boundsY, metrics.boundsY),
    }),
    [metrics.boundsX, metrics.boundsY, offset.x, offset.y],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!metrics.width || !metrics.height) {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: clampedOffset,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY

    setOffset({
      x: clamp(dragStateRef.current.origin.x + deltaX, -metrics.boundsX, metrics.boundsX),
      y: clamp(dragStateRef.current.origin.y + deltaY, -metrics.boundsY, metrics.boundsY),
    })
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleCrop = async () => {
    const image = imageRef.current

    if (!image || !metrics.scale) {
      return
    }

    const left = cropSize / 2 - metrics.width / 2 + clampedOffset.x
    const top = cropSize / 2 - metrics.height / 2 + clampedOffset.y
    const sourceX = -left / metrics.scale
    const sourceY = -top / metrics.scale
    const sourceSize = cropSize / metrics.scale

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    )

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })

    if (!blob) {
      return
    }

    onComplete(
      new File([blob], replaceFileExtension(fileName, '.jpg'), {
        type: 'image/jpeg',
      }),
    )
  }

  const left = cropSize / 2 - metrics.width / 2 + clampedOffset.x
  const top = cropSize / 2 - metrics.height / 2 + clampedOffset.y
  const previewScale = previewSize / cropSize
  const cropInset = Math.max(14, Math.round(cropSize * 0.056))

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden rounded-[2rem] border-[#EADCCF] bg-[#FFFDF9] p-0 shadow-[0_34px_90px_-45px_rgba(47,42,42,0.48)]"
      >
        <DialogHeader className="border-b border-[#EADCCF] bg-[#FFF7F8] px-6 py-5 text-left">
          <DialogTitle className="text-2xl text-[#2F2A2A]">Atur foto profil</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#6E6666]">
            Geser foto untuk menentukan fokus, lalu atur zoom sampai pas untuk avatar profil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Area crop</p>
              <div
                ref={cropFrameRef}
                role="presentation"
                className={`relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[2rem] border border-[#EADCCF] bg-[#F7F4EF] touch-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
                {imageSrc && (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Pratinjau crop avatar"
                    draggable={false}
                    className="pointer-events-none absolute select-none"
                    style={{
                      width: `${metrics.width}px`,
                      height: `${metrics.height}px`,
                      left: `${left}px`,
                      top: `${top}px`,
                    }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/80" />
                <div
                  className="pointer-events-none absolute border border-white/90 shadow-[0_0_0_9999px_rgba(47,42,42,0.12)]"
                  style={{
                    inset: `${cropInset}px`,
                    borderRadius: `${Math.max(24, Math.round(cropSize * 0.09))}px`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3 rounded-[1.8rem] border border-[#EADCCF] bg-[#FFFCF8] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Pratinjau profil</p>
                <div className="flex justify-center">
                  <div
                    ref={previewFrameRef}
                    className="relative aspect-square w-24 overflow-hidden rounded-full border border-[#EADCCF] bg-[#F7F4EF] sm:w-32"
                  >
                    {imageSrc && (
                      <img
                        src={imageSrc}
                        alt="Pratinjau avatar bulat"
                        draggable={false}
                        className="pointer-events-none absolute select-none"
                        style={{
                          width: `${metrics.width * previewScale}px`,
                          height: `${metrics.height * previewScale}px`,
                          left: `${left * previewScale}px`,
                          top: `${top * previewScale}px`,
                        }}
                      />
                    )}
                  </div>
                </div>
                <p className="text-sm leading-6 text-[#6E6666]">
                  Hasil akhir akan disimpan dalam format persegi dan tampil bulat di profil.
                </p>
              </div>

              <div className="space-y-3 rounded-[1.8rem] border border-[#EADCCF] bg-[#FFFCF8] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#2F2A2A]">Zoom</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-[#8B7676]">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={2.5}
                  step={0.01}
                  onValueChange={(values) => setZoom(values[0] || 1)}
                  className="[&_[data-slot=slider-range]]:bg-[#E8BFCB]"
                />
                <p className="text-sm leading-6 text-[#6E6666]">
                  Gunakan zoom secukupnya agar wajah atau bagian penting foto terlihat lebih rapi.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[#EADCCF] bg-[#FFFDF9] px-6 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-full border-[#EADCCF] bg-[#FFFDF9] text-[#2F2A2A] hover:bg-[#FFF7F8]"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => void handleCrop()}
            className="rounded-full bg-[#2F2A2A] text-[#FFFDF9] hover:bg-[#2F2A2A]/92"
          >
            Gunakan Foto Ini
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
