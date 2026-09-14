import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Download, Plus, Copy, Check, RefreshCw, Send, Sliders, FileText } from 'lucide-react';

export interface AiImageGeneratorSectionProps {
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  onSendToEditor?: (imageUrl: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CATEGORIES = [
  'Human Anatomy',
  'Biology Diagrams',
  'Chemistry Laboratory',
  'Chemical Structures',
  'Physics Experiments',
  'Mathematics & Geometry',
  'Historical Events & Maps',
  'Geography & Landscapes',
  'Astronomy & Solar System',
  'Animals & Plants',
  'Microscopy & Cells',
  'Engineering & Physics',
  'Flowcharts & Timelines',
  'Educational Posters'
];

export const AiImageGeneratorSection: React.FC<AiImageGeneratorSectionProps> = ({
  onInsertToAssignment,
  onSendToEditor,
  showToast
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Biology Diagrams');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '3:4'>('1:1');
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [count, setCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string; category: string }>>([
    {
      url: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=800&auto=format&fit=crop&q=80',
      prompt: 'Detailed plant cell anatomy diagram showing mitochondria, nucleus, cell wall, and chloroplasts.',
      category: 'Biology Diagrams'
    }
  ]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          category,
          aspectRatio,
          quality,
          count
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Server returned error during image generation.');
      }
      if (data.images && data.images.length > 0) {
        const newImgs = data.images.map((url: string) => ({
          url,
          prompt,
          category
        }));
        setGeneratedImages([...newImgs, ...generatedImages]);
        showToast('Educational image generated successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Image Gen error:', err);
      showToast('Image generation error: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Image URL copied!', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Educational Image Generator</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Generate high-precision textbook diagrams, anatomy illustrations, physics experiments, and maps.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black">
          Powered by Gemini 3.1 Flash Image
        </span>
      </div>

      {/* INPUT FORM & OPTIONS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-2">
              Educational Image Prompt *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Cross section of human heart showing ventricles, atrium, and aorta valves in high detail..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#002147]"
              />
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="px-6 py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
                <span>{isGenerating ? 'Generating...' : 'Generate Image'}</span>
              </button>
            </div>
          </div>

          {/* CONTROLS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Subject Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e: any) => setAspectRatio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value="1:1">Square (1:1)</option>
                <option value="16:9">Landscape (16:9)</option>
                <option value="3:4">Portrait (3:4)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Resolution Quality</label>
              <select
                value={quality}
                onChange={(e: any) => setQuality(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value="standard">Standard (512px)</option>
                <option value="high">High Definition (1K)</option>
                <option value="ultra">Ultra Quality (2K/4K)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Images Per Request</label>
              <select
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value={1}>1 Image</option>
                <option value={2}>2 Images</option>
                <option value={3}>3 Images</option>
                <option value={4}>4 Images</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* GENERATED GALLERY */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider">Generated Educational Image Collection</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {generatedImages.map((img, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-[#D4AF37] transition">
              <div className="relative aspect-square bg-slate-900 overflow-hidden">
                <img
                  src={img.url}
                  alt={img.prompt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md text-amber-300 text-[10px] font-extrabold rounded-lg border border-amber-400/30">
                  {img.category}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs font-medium text-slate-700 line-clamp-2">
                  "{img.prompt}"
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  <a
                    href={img.url}
                    download={`educational_diagram_${idx}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-[#002147] rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  {onInsertToAssignment && (
                    <button
                      onClick={() => onInsertToAssignment(`Diagram: ${img.prompt}`, img.url)}
                      className="py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Insert in Assignment</span>
                    </button>
                  )}

                  {onSendToEditor && (
                    <button
                      onClick={() => onSendToEditor(img.url)}
                      className="py-1.5 px-3 bg-[#002147] hover:bg-[#003366] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Edit & Label</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
