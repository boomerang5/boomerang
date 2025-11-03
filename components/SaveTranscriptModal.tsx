import React from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  // onChoose(saveTranscript, title?) - title is provided when saveTranscript is true
  onChoose: (saveTranscript: boolean, title?: string) => void;
  question?: string;
  submitButtonText?: string;
};

export default function SaveTranscriptModal({ open, onClose, onChoose, question = '¿Querés guardar la transcripción de esta llamada?', submitButtonText = 'Guardar' }: Props) {
  if (!open) return null;

  const [showTitleInput, setShowTitleInput] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  const onClickSi = () => {
    setShowTitleInput(true);
    // focus will be handled by input's autoFocus
  };

  const onSubmitCall = () => {
    setTouched(true);
    if (!title.trim()) return;
    onChoose(true, title.trim());
  };

  const onClickNo = () => onChoose(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[90%] max-w-lg rounded-2xl bg-white dark:bg-[#111] border border-white/20 shadow-2xl p-6 md:p-8">
        {/* Close button positioned absolutely so the question can be vertically centered */}
        <button className="absolute top-3 right-3 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={onClose} aria-label="Cerrar" title="Cerrar">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center justify-center gap-4 min-h-[88px]">
          <h3 className="text-lg font-semibold text-foreground text-center leading-tight">{question}</h3>

          {!showTitleInput ? (
            <div className="flex justify-center gap-4">
              <button
                onClick={onClickSi}
                className="px-4 py-2 rounded-md font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:brightness-105"
              >
                Si
              </button>

              <button
                onClick={onClickNo}
                className="px-4 py-2 rounded-md font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
              >
                No
              </button>
            </div>
          ) : (
            <div className="w-full">
              <label className="block text-sm mb-2 text-muted-foreground">Título de la transcripción (obligatorio)</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Ej: Llamada con Juan - Reunión ventas"
                className="w-full px-4 py-2 rounded-md border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-foreground focus:ring-2 focus:ring-orange-400"
              />
              {touched && !title.trim() && (
                <p className="text-xs text-red-600 mt-2">El título es obligatorio para guardar la transcripción.</p>
              )}

              <div className="mt-4 flex justify-center">
                <button
                  onClick={onSubmitCall}
                  className={`px-4 py-2 rounded-md font-semibold text-white ${title.trim() ? 'bg-gradient-to-r from-orange-400 to-orange-600 hover:brightness-105' : 'bg-gray-300 cursor-not-allowed'}`}
                  disabled={!title.trim()}
                >
                  {submitButtonText}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
