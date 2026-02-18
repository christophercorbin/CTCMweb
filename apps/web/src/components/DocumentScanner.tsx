import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { uploadDocument } from '../lib/storage';

interface ExtractedData {
  trackingNumber?: string;
  warehouseReceiptNumber?: string;
  receivedDate?: string;
  shipperName?: string;
  shipperAddress?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  packages?: Array<{
    piecesCount?: number;
    weightKg?: number;
    dimensions?: string;
  }>;
}

interface DocumentScannerProps {
  onExtract: (data: ExtractedData) => void;
  entityId?: string; // Entity ID for document storage (shipment ID, customer ID, etc.)
  documentType?: 'invoices' | 'receipts' | 'documents' | 'shipments';
}

export const DocumentScanner = ({ onExtract, entityId, documentType = 'receipts' }: DocumentScannerProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }

    if (imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setFiles(imageFiles);

    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews(newPreviews);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one document image');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Uploading documents...');

    try {
      // Upload files to Amplify Storage
      const uploadedDocuments = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tempEntityId = entityId || `temp-${Date.now()}`;
        
        const result = await uploadDocument({
          documentType,
          entityId: tempEntityId,
          file,
          onProgress: (progress) => {
            const overallProgress = ((i / files.length) * 100) + (progress / files.length);
            setUploadProgress(Math.round(overallProgress));
          },
        });
        
        uploadedDocuments.push(result);
      }

      toast.dismiss(loadingToast);
      toast.success(`${files.length} document(s) uploaded successfully`);
      
      // TODO: Phase 6 - Trigger OCR processing via API
      // For now, just return empty data
      onExtract({
        trackingNumber: '',
        shipperName: '',
        shipperAddress: '',
      });

      // Clean up
      setFiles([]);
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload documents';
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-600 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            AI Auto-Fill
            <span className="text-xs font-normal bg-blue-600 text-white px-2 py-0.5 rounded-full">
              Coming in Phase 4
            </span>
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Upload photos of your bill of lading, packing slip, or warehouse receipt. AI will automatically extract and fill all the details.
          </p>
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 mb-4">
            OCR features will be available after Phase 4 (AWS Textract integration)
          </p>

          {files.length === 0 ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="document-upload"
              />
              <label htmlFor="document-upload">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Documents
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supports JPG, PNG, HEIC. Max 5 images.
              </p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded text-center truncate">
                      {files[index].name}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleExtract}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upload & Extract Data
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
              
              {loading && uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
