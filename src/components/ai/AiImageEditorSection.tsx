import React, { useState } from 'react';
import { Sliders, Sparkles, Upload, RefreshCw, Download, Check, ArrowRight, Layers, Tag, Eye, Image as ImageIcon } from 'lucide-react';

export interface AiImageEditorSectionProps {
  initialImageUrl?: string;
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiImageEditorSection: React.FC<AiImageEditorSectionProps> = ({
  initialImageUrl,
  onInsertToAssignment,
  showToast
}) => {
  const [currentImage, setCurrentImage] = useState<string>(
    initialImageUrl || 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=800&auto=format&fit=crop&q=80'
  );
  const [editType, setEditType] = useState<string>('add_labels');
  const [instruction, setInstruction] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedResult, setEditedResult] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCurrentImage(reader.result as string);
      setEditedResult(null);
      showToast('New image loaded into editor', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyEdit = async () => {
    if (!currentImage || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentImage,
          editType,
          instruction
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Image editing API failed.');
      }
      if (data.image) {
        setEditedResult(data.image);
        showToast('Image edit applied successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Edit image error:', err);
      showToast('Image edit error: ' + (err?.message || 'Check network connection'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Educational Image Editor & Annotator</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Add anatomical labels, leader arrows, remove backgrounds, highlight organelles, and enhance diagram clarity.
          </p>
        </div>

        <label className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-2xl cursor-pointer transition flex items-center gap-2 shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload Image</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* EDITOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CONTROLS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Select AI Editing Action</h3>

          <div className="space-y-2">
            {[
              { id: 'add_labels', label: 'Add Anatomical / Feature Labels', icon: Tag, desc: 'Adds clear text labels & pointers' },
              { id: 'add_arrows', label: 'Add Callout Arrows & Vectors', icon: ArrowRight, desc: 'Points out key process steps' },
              { id: 'remove_bg', label: 'Remove Background', icon: Layers, desc: 'Isolates diagram onto clean canvas' },
              { id: 'highlight_object', label: 'Highlight Key Organelle/Structure', icon: Eye, desc: 'Brings focus to specific part' },
              { id: 'variations', label: 'Generate Textbook Vector Style', icon: Sparkles, desc: 'Converts to clean textbook vector' },
            ].map(tool => {
              const Icon = tool.icon;
              const isSelected = editType === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setEditType(tool.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    isSelected 
                      ? 'bg-[#002147] border-[#D4AF37] text-white shadow-md' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#D4AF37] text-[#002147]' : 'bg-slate-200 text-slate-600'}`}>
                    <Icon className="w-4 h-4 font-bold" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{tool.label}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-amber-300' : 'text-slate-500'}`}>{tool.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Specific Instruction / Notes</label>
            <textarea
              rows={3}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="e.g. Label the chloroplast, mitochondria, and central vacuole in bold yellow arrows..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#002147]"
            />
          </div>

          <button
            onClick={handleApplyEdit}
            disabled={isProcessing}
            className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
            <span>{isProcessing ? 'Processing Image AI...' : 'Apply AI Edit'}</span>
          </button>
        </div>

        {/* IMAGE COMPARISON PREVIEW */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ORIGINAL */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-[#002147] uppercase tracking-wider block mb-2">Original Diagram</span>
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
                <img src={currentImage} alt="Original input" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* EDITED RESULT */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-[#002147] uppercase tracking-wider block mb-2">AI Annotated Output</span>
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                {isProcessing ? (
                  <div className="text-center space-y-2 text-white p-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto" />
                    <p className="text-xs font-bold">Applying AI diagram annotations...</p>
                  </div>
                ) : editedResult ? (
                  <img src={editedResult} alt="Annotated result" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400 p-6 space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-medium">Click "Apply AI Edit" to view annotated diagram</p>
                  </div>
                )}
              </div>
            </div>

            {editedResult && (
              <div className="pt-3 flex gap-2">
                <a
                  href={editedResult}
                  download="annotated_educational_diagram.png"
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-[#002147] font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                {onInsertToAssignment && (
                  <button
                    onClick={() => onInsertToAssignment('Annotated Diagram', editedResult)}
                    className="flex-1 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <span>Insert in Assignment</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
