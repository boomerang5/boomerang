import React from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  // onConfirm(title, description, transcriptionEnabled)
  onConfirm: (title: string, description: string, transcriptionEnabled: boolean) => void;
};

export default function CallConfigModal({ open, onClose, onConfirm }: Props) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [transcriptionEnabled, setTranscriptionEnabled] = React.useState(false);
  const [titleTouched, setTitleTouched] = React.useState(false);

  if (!open) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTitleTouched(true);
    
    if (!title.trim()) return;
    
    onConfirm(title.trim(), description.trim(), transcriptionEnabled);
    
    // Limpiar el formulario
    setTitle('');
    setDescription('');
    setTranscriptionEnabled(false);
    setTitleTouched(false);
  };

  const handleClose = () => {
    // Limpiar el formulario al cerrar
    setTitle('');
    setDescription('');
    setTranscriptionEnabled(false);
    setTitleTouched(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-[90%] max-w-lg rounded-2xl bg-white dark:bg-[#111] border border-white/20 shadow-2xl p-6 md:p-8">
        
        {/* Botón de cerrar */}
        <button 
          className="absolute top-3 right-3 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" 
          onClick={handleClose} 
          aria-label="Cerrar" 
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Contenido del modal */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-foreground text-center">
            Configurar Llamada
          </h3>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Título - Obligatorio */}
            <div>
              <label htmlFor="call-title" className="block text-sm font-medium mb-2 text-foreground">
                Título de la llamada <span className="text-red-500">*</span>
              </label>
              <input
                id="call-title"
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                placeholder="Ej: Llamada Boomerang"
                className="w-full px-4 py-2 rounded-md border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-foreground focus:ring-2 focus:ring-orange-400"
                maxLength={100}
              />
              {titleTouched && !title.trim() && (
                <p className="text-xs text-red-600 mt-1">El título es obligatorio.</p>
              )}
            </div>

            {/* Descripción - Opcional */}
            <div>
              <label htmlFor="call-description" className="block text-sm font-medium mb-2 text-foreground">
                Descripción (opcional)
              </label>
              <textarea
                id="call-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción de la llamada..."
                rows={3}
                className="w-full px-4 py-2 rounded-md border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-foreground focus:ring-2 focus:ring-orange-400 resize-none"
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/250 caracteres
              </p>
            </div>

            {/* Toggle de Transcripción */}
            <div className="flex items-center justify-between p-3 bg-white/30 dark:bg-white/5 rounded-lg border border-white/20">
              <div>
                <label htmlFor="transcription-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                  Activar Transcripción
                </label>
                <p className="text-xs text-muted-foreground">
                  Guarda automáticamente la transcripción de la llamada
                </p>
              </div>
              
              <button
                id="transcription-toggle"
                type="button"
                onClick={() => setTranscriptionEnabled(!transcriptionEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 ${
                  transcriptionEnabled 
                    ? 'bg-orange-500' 
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={transcriptionEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    transcriptionEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md border border-white/30 bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition text-foreground"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={!title.trim()}
                className={`px-4 py-2 rounded-md font-semibold transition ${
                  title.trim()
                    ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:brightness-105'
                    : 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
              >
                Iniciar Llamada
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}