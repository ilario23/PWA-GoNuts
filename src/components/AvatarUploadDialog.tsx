import React, { useState, useCallback, useRef } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Loader2, ZoomIn, ZoomOut, Image as ImageIcon } from 'lucide-react'
import getCroppedImg from '@/lib/imageUtils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthProvider'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import imageCompression from 'browser-image-compression'

interface AvatarUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUploadComplete: (url: string) => void
    onRemove?: () => void
    hasCurrentAvatar?: boolean
}

export function AvatarUploadDialog({
    open,
    onOpenChange,
    onUploadComplete,
    onRemove,
    hasCurrentAvatar,
}: AvatarUploadDialogProps) {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const onClose = () => {
        setImageSrc(null)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
        onOpenChange(false)
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]

            // Basic validation
            if (!file.type.startsWith('image/')) {
                toast.error(t('invalid_image_type', { defaultValue: 'Please select an image file' }))
                return
            }

            // Read file
            const reader = new FileReader()
            reader.addEventListener('load', () => {
                setImageSrc(reader.result?.toString() || null)
            })
            reader.readAsDataURL(file)
        }
    }

    const handleRemove = () => {
        if (onRemove) {
            onRemove()
            onClose()
        }
    }

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels || !user) return

        setUploading(true)
        try {
            // 1. Get cropped image blob
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
            if (!croppedBlob) throw new Error('Failed to crop image')

            // 2. Compress image (optional but recommended for avatars)
            const compressedFile = await imageCompression(croppedBlob as File, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 512,
                useWebWorker: true,
                fileType: 'image/jpeg',
            })

            // 3. Upload to Supabase
            const timestamp = new Date().getTime()
            const filePath = `${user.id}/${timestamp}.jpg`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, compressedFile, {
                    cacheControl: '3600',
                    upsert: false // Create new file
                })

            if (uploadError) throw uploadError

            // 4. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            onUploadComplete(publicUrl)
            onClose()
            toast.success(t('avatar_updated', { defaultValue: 'Profile picture updated' }))

        } catch (error) {
            console.error('Error uploading avatar:', error)
            toast.error(t('avatar_upload_error', { defaultValue: 'Failed to upload profile picture' }))
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('update_profile_picture', { defaultValue: 'Update Profile Picture' })}</DialogTitle>
                    <DialogDescription>
                        {t('upload_avatar_desc', { defaultValue: 'Upload and crop your new profile picture.' })}
                    </DialogDescription>
                </DialogHeader>

                {!imageSrc ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md border-muted-foreground/25 bg-muted/5 gap-4">
                        <div className="p-4 rounded-full bg-background ring-1 ring-border shadow-sm">
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-medium">{t('drag_drop_or_click', { defaultValue: 'Select an image to upload' })}</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG, GIF</p>
                        </div>
                        <div className="flex gap-2 w-full justify-center">
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                {t('select_image', { defaultValue: 'Select Image' })}
                            </Button>
                            {hasCurrentAvatar && onRemove && (
                                <Button variant="destructive" onClick={handleRemove}>
                                    {t('remove_photo', { defaultValue: 'Remove Photo' })}
                                </Button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative w-full h-[300px] bg-black rounded-md overflow-hidden ring-1 ring-border">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                showGrid={false}
                                cropShape="round"
                            />
                        </div>

                        <div className="flex items-center gap-4 px-2">
                            <ZoomOut className="w-4 h-4 text-muted-foreground" />
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(vals: number[]) => setZoom(vals[0])}
                                className="flex-1"
                            />
                            <ZoomIn className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {imageSrc && (
                        <Button variant="outline" onClick={() => setImageSrc(null)} disabled={uploading}>
                            {t('cancel', { defaultValue: 'Cancel' })}
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={!imageSrc || uploading} className="w-full sm:w-auto">
                        {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('save', { defaultValue: 'Save' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
