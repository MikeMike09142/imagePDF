import React, { useState, useCallback } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileImage, Upload, FileDown, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface ImageFile extends File {
  preview?: string;
}

function SortableItem({ id, file, index, removeImage }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
      <img src={file.preview} alt={file.name} className="h-24 w-full object-cover rounded-lg" />
      <button
        onClick={() => removeImage(index)}
        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [converting, setConverting] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfName, setPdfName] = useState('mis-imagenes');

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.match('image/(jpeg|png|webp)')
    );
    const newImages = files.map(file =>
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file =>
        file.type.match('image/(jpeg|png|webp)')
      );
      const newImages = files.map(file =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview!);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setImages((prev) => {
        const oldIndex = prev.findIndex((item) => item.preview === active.id);
        const newIndex = prev.findIndex((item) => item.preview === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const convertToPDF = async () => {
    if (images.length === 0) return;
    setConverting(true);
    try {
      if (images.length > 30) {
        const confirm = window.confirm(
          'Tienes muchas imágenes. El PDF puede ser muy grande. ¿Deseas continuar?'
        );
        if (!confirm) {
          setConverting(false);
          return;
        }
      }
  
      const pdf = new jsPDF({ orientation });
  
      let firstPage = true;
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
  
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.src = image.preview!;
          img.onload = () => {
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
  
            // Scale the image to exactly fit the page dimensions
            const imgWidth = pageWidth;
            const imgHeight = pageHeight;
  
            const format = image.type.includes('png') ? 'PNG' : image.type.includes('webp') ? 'WEBP' : 'JPEG';
            if (!firstPage) pdf.addPage();
            pdf.addImage(img, format, 0, 0, imgWidth, imgHeight);
            firstPage = false;
            resolve();
          };
        });
      }
  
      pdf.save(`${pdfName || 'mis-imagenes'}.pdf`);
    } catch (error) {
      console.error('Error converting to PDF:', error);
      alert('Error al convertir las imágenes a PDF.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <FileImage className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">
            Convertidor de Imágenes a PDF
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Arrastra y suelta tus imágenes o selecciónalas desde tu computadora
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <input
            type="text"
            placeholder="Nombre del PDF"
            value={pdfName}
            onChange={e => setPdfName(e.target.value)}
            className="border rounded-md px-3 py-1 w-full"
          />
          <select
            value={orientation}
            onChange={e => setOrientation(e.target.value as 'portrait' | 'landscape')}
            className="border rounded-md px-3 py-1 w-full"
          >
            <option value="portrait">Orientación: Vertical (Portrait)</option>
            <option value="landscape">Orientación: Horizontal (Landscape)</option>
          </select>
        </div>

        <div
          className="mt-6 flex justify-center"
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          <div className="w-full">
            <label className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-600">
              <div className="flex items-center space-x-2">
                <Upload className="w-6 h-6 text-gray-600" />
                <span className="font-medium text-gray-600">
                  Arrastra las imágenes aquí o haz clic para seleccionar
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                />
              </div>
            </label>

            {images.length > 0 && (
              <div className="mt-8 space-y-4">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={images.map((file) => file.preview!)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {images.map((file, index) => (
                        <SortableItem
                          key={file.preview}
                          id={file.preview!}
                          file={file}
                          index={index}
                          removeImage={removeImage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <div className="flex justify-center">
                  <button
                    onClick={convertToPDF}
                    disabled={converting}
                    className="inline-flex items-center px-4 py-2 text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <FileDown className="w-5 h-5 mr-2" />
                    {converting ? 'Convirtiendo...' : 'Convertir a PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;