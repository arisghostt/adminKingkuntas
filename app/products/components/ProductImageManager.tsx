'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/app/hooks/useLanguage';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductImageManagerProps {
    existingImages: string[];
    mainImage: string | null;
    onMainImageChange: (file: File | null) => void;
    onImagesChange: (newFiles: File[], urlsToDelete: string[]) => void;
}

export default function ProductImageManager({
    existingImages,
    mainImage,
    onMainImageChange,
    onImagesChange,
}: ProductImageManagerProps) {
    const { t } = useLanguage();

    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
    const [urlsToDelete, setUrlsToDelete] = useState<string[]>([]);
    const [mainNewFile, setMainNewFile] = useState<File | null>(null);
    const [mainNewPreview, setMainNewPreview] = useState<string | null>(null);
    const [clearMainExisting, setClearMainExisting] = useState(false);

    useEffect(() => {
        // Notify parent on change
        onImagesChange(newFiles, urlsToDelete);
    }, [newFiles, urlsToDelete, onImagesChange]);

    useEffect(() => {
        onMainImageChange(mainNewFile);
    }, [mainNewFile, onMainImageChange]);

    // Clean up object URLs
    useEffect(() => {
        return () => {
            newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
            if (mainNewPreview) URL.revokeObjectURL(mainNewPreview);
        };
    }, []); // Only on unmount to prevent flickering if state changes

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
            file.type.startsWith('image/')
        );
        if (!droppedFiles.length) return;

        if (!mainImage && !clearMainExisting && !mainNewFile) {
            const first = droppedFiles[0];
            setMainNewFile(first);
            setMainNewPreview(URL.createObjectURL(first));
            const rest = droppedFiles.slice(1);
            if (rest.length) {
                setNewFiles((prev) => [...prev, ...rest]);
                setNewFilePreviews((prev) => [
                    ...prev,
                    ...rest.map((r) => URL.createObjectURL(r)),
                ]);
            }
        } else {
            setNewFiles((prev) => [...prev, ...droppedFiles]);
            setNewFilePreviews((prev) => [
                ...prev,
                ...droppedFiles.map((f) => URL.createObjectURL(f)),
            ]);
        }
    }, [mainImage, clearMainExisting, mainNewFile]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const selectedFiles = Array.from(e.target.files).filter((file) =>
            file.type.startsWith('image/')
        );

        if (!selectedFiles.length) return;

        if (!mainImage && !mainNewFile && (!clearMainExisting || existingImages.length === 0)) {
            const first = selectedFiles[0];
            setMainNewFile(first);
            setMainNewPreview(URL.createObjectURL(first));
            const rest = selectedFiles.slice(1);
            if (rest.length) {
                setNewFiles((prev) => [...prev, ...rest]);
                setNewFilePreviews((prev) => [
                    ...prev,
                    ...rest.map((r) => URL.createObjectURL(r)),
                ]);
            }
        } else {
            setNewFiles((prev) => [...prev, ...selectedFiles]);
            setNewFilePreviews((prev) => [
                ...prev,
                ...selectedFiles.map((f) => URL.createObjectURL(f)),
            ]);
        }

        // Reset input
        e.target.value = '';
    };

    const removeMainImage = () => {
        if (mainNewFile) {
            setMainNewFile(null);
            if (mainNewPreview) URL.revokeObjectURL(mainNewPreview);
            setMainNewPreview(null);
        } else if (mainImage) {
            setClearMainExisting(true);
            // Wait for the parent to actually clear on submit, but visually clear it here
        }
    };

    const deleteExistingImage = (url: string) => {
        setUrlsToDelete((prev) => [...prev, url]);
    };

    const undoDeleteExistingImage = (url: string) => {
        setUrlsToDelete((prev) => prev.filter((u) => u !== url));
    };

    const removeNewFile = (index: number) => {
        setNewFiles((prev) => prev.filter((_, i) => i !== index));
        const urlToRemove = newFilePreviews[index];
        URL.revokeObjectURL(urlToRemove);
        setNewFilePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const activeExistingGallery = existingImages.filter(
        (img) => !urlsToDelete.includes(img)
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Image Dropzone / Preview */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Image
                    </label>
                    <div className="block w-full">
                        {mainNewPreview || (!clearMainExisting && mainImage) ? (
                            <div className="relative group aspect-square rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center">
                                <img
                                    src={mainNewPreview || mainImage!}
                                    alt="Main Product"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={removeMainImage}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-sm"
                                    title="Remove Main Image"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-lg pointer-events-none transition-colors" />
                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                                    {mainNewPreview ? 'New main image' : 'Current main image'}
                                </div>
                            </div>
                        ) : (
                            <label
                                className="flex flex-col items-center justify-center group aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                                <span className="text-sm text-gray-500 font-medium group-hover:text-blue-600">Select main image</span>
                                <span className="text-xs text-gray-400 mt-1">Drag & drop or click</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* Gallery Images Dropzone */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gallery Images
                    </label>
                    <div
                        className="w-full h-full min-h-[160px] rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-colors flex flex-col justify-center items-center py-8 cursor-pointer group relative"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className="flex flex-col items-center pointer-events-none">
                            <ImageIcon className="w-10 h-10 text-gray-400 group-hover:text-blue-500 mb-2" />
                            <span className="text-sm text-gray-600 font-medium group-hover:text-blue-700">Add gallery images</span>
                            <span className="text-xs text-gray-400 mt-1">Select multiple files at once</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Gallery Previews Grid */}
            {(activeExistingGallery.length > 0 || urlsToDelete.length > 0 || newFilePreviews.length > 0) && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Gallery Preview</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        <AnimatePresence>
                            {activeExistingGallery.map((url, i) => (
                                <motion.div
                                    key={`ext-${url}-${i}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="relative group aspect-square rounded-lg border border-gray-200 overflow-hidden"
                                >
                                    <img src={url} alt="Gallery item" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => deleteExistingImage(url)}
                                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                        title="Mark for deletion"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}

                            {newFilePreviews.map((url, i) => (
                                <motion.div
                                    key={`new-${url}-${i}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="relative group aspect-square rounded-lg border-2 border-blue-200 overflow-hidden"
                                >
                                    <img src={url} alt="New gallery item" className="w-full h-full object-cover" />
                                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-sm pointer-events-none">
                                        NEW
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeNewFile(i)}
                                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}

                            {urlsToDelete.map((url, i) => (
                                <motion.div
                                    key={`del-${url}-${i}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 0.5, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="relative group aspect-square rounded-lg border-2 border-red-300 overflow-hidden flex items-center justify-center bg-gray-100 grayscale hover:grayscale-0 transition-all"
                                >
                                    <img src={url} alt="Deleted gallery item" className="w-full h-full object-cover opacity-50" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[2px] bg-red-900/10">
                                        <span className="text-red-700 bg-white/90 px-2 py-1 rounded text-xs font-semibold mb-2">
                                            Will delete
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => undoDeleteExistingImage(url)}
                                            className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors shadow-sm"
                                        >
                                            Undo
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}
