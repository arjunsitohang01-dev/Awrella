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

const CROP_SIZE = 320
const OUTPUT_SIZE = 512
const PREVIEW_SIZE = 128

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

    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height)
    const scale = baseScale * zoom
    const width = imageSize.width * scale
    const height = imageSize.height * scale

    return {
      scale,
      width,
      height,
      boundsX: Math.max(0, (width - CROP_SIZE) / 2),
      boundsY: Math.max(0, (height - CROP_SIZE) / 2),
    }
  }, [imageSize.height, imageSize.width, zoom])

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

    const left = CROP_SIZE / 2 - metrics.width / 2 + clampedOffset.x
    const top = CROP_SIZE / 2 - metrics.height / 2 + clampedOffset.y
    const sourceX = -left / metrics.scale
    const sourceY = -top / metrics.scale
    const sourceSize = CROP_SIZE / metrics.scale

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

  const left = CROP_SIZE / 2 - metrics.width / 2 + clampedOffset.x
  const top = CROP_SIZE / 2 - metrics.height / 2 + clampedOffset.y

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl rounded-[2rem] border-[#EADCCF] bg-[#FFFDF9] p-0 shadow-[0_34px_90px_-45px_rgba(47,42,42,0.48)]"
      >
        <DialogHeader className="border-b border-[#EADCCF] bg-[#FFF7F8] px-6 py-5 text-left">
          <DialogTitle className="text-2xl text-[#2F2A2A]">Atur foto profil</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#6E6666]">
            Geser foto untuk menentukan fokus, lalu atur zoom sampai pas untuk avatar profil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Area crop</p>
              <div
                role="presentation"
                className={`relative mx-auto h-[320px] w-[320px] overflow-hidden rounded-[2rem] border border-[#EADCCF] bg-[#F7F4EF] ${
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
                <div className="pointer-events-none absolute inset-[18px] rounded-[1.6rem] border border-white/90 shadow-[0_0_0_9999px_rgba(47,42,42,0.12)]" />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3 rounded-[1.8rem] border border-[#EADCCF] bg-[#FFFCF8] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8B7676]">Pratinjau profil</p>
                <div className="flex justify-center">
                  <div className="relative h-32 w-32 overflow-hidden rounded-full border border-[#EADCCF] bg-[#F7F4EF]">
                    {imageSrc && (
                      <img
                        src={imageSrc}
                        alt="Pratinjau avatar bulat"
                        draggable={false}
                        className="pointer-events-none absolute select-none"
                        style={{
                          width: `${metrics.width * (PREVIEW_SIZE / CROP_SIZE)}px`,
                          height: `${metrics.height * (PREVIEW_SIZE / CROP_SIZE)}px`,
                          left: `${left * (PREVIEW_SIZE / CROP_SIZE)}px`,
                          top: `${top * (PREVIEW_SIZE / CROP_SIZE)}px`,
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
