import { useCallback, useId, useState, forwardRef } from "react";
import type { ContentAreaValue } from "./flashcardContentUtils";

type FlashcardContentAreaProps = {
  label: string;
  value: ContentAreaValue;
  onChange: (value: ContentAreaValue) => void;
  error?: string;
  hideLabel?: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

async function fileToDataUrl(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Use PNG, JPEG, WebP, or GIF.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds 5MB limit.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export const FlashcardContentArea = forwardRef<HTMLTextAreaElement, FlashcardContentAreaProps>(
  function FlashcardContentArea({ label, value, onChange, error, hideLabel = false }, ref) {
    const areaId = useId();
    const [pasteError, setPasteError] = useState<string | null>(null);

    const applyImageFile = useCallback(
      async (file: File) => {
        const dataUrl = await fileToDataUrl(file);
        onChange({
          ...value,
          imagePreview: dataUrl,
          imageData: dataUrl,
          removeImage: false,
        });
      },
      [onChange, value]
    );

    const handlePaste = useCallback(
      async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return;

        const imageItem = Array.from(clipboard.items).find((item) =>
          item.type.startsWith("image/")
        );
        const imageFile = imageItem?.getAsFile() ?? null;
        if (!imageFile) return;

        event.preventDefault();
        const text = clipboard.getData("text/plain");

        try {
          setPasteError(null);
          const dataUrl = await fileToDataUrl(imageFile);
          const textarea = event.currentTarget;
          const nextText = text
            ? value.text.slice(0, textarea.selectionStart) +
              text +
              value.text.slice(textarea.selectionEnd)
            : value.text;

          onChange({
            text: nextText,
            imagePreview: dataUrl,
            imageData: dataUrl,
            existingImagePath: value.existingImagePath,
            removeImage: false,
          });
        } catch (err) {
          setPasteError(err instanceof Error ? err.message : "Paste failed");
        }
      },
      [onChange, value]
    );

    const handleRemoveImage = () => {
      onChange({
        ...value,
        imagePreview: null,
        imageData: null,
        existingImagePath: null,
        removeImage: true,
      });
    };

    const displayImage =
      value.imagePreview ??
      (value.existingImagePath && !value.removeImage ? value.existingImagePath : null);

    return (
      <div className="precision-form-content">
        {!hideLabel ? (
          <label htmlFor={areaId} className="precision-form-field__label">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={areaId}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          onPaste={handlePaste}
          rows={3}
          spellCheck={false}
          placeholder="Text or paste image (Ctrl+V / Cmd+V)"
          className="precision-form-field__textarea"
        />
        <div
          tabIndex={0}
          role="group"
          aria-label={`${label} image paste target`}
          onPaste={(event) => {
            const file = Array.from(event.clipboardData?.items ?? [])
              .find((item) => item.type.startsWith("image/"))
              ?.getAsFile();
            if (file) {
              event.preventDefault();
              void applyImageFile(file).catch((err) => {
                setPasteError(err instanceof Error ? err.message : "Paste failed");
              });
            }
          }}
          className="precision-form-content__paste-zone"
        >
          Paste an image here while focused, or paste into the text box above.
        </div>
        {displayImage ? (
          <div className="precision-form-content__image-wrap">
            <img
              src={displayImage}
              alt={`${label} preview`}
              className="precision-form-content__image"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="precision-form-content__remove-image"
            >
              Remove image
            </button>
          </div>
        ) : null}
        {error ? <p className="precision-form-card__error">{error}</p> : null}
        {pasteError ? <p className="precision-form-card__error">{pasteError}</p> : null}
      </div>
    );
  }
);
