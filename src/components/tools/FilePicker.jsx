import { useRef } from "react";

export default function FilePicker({ id, label, inputLabel = label, accept, onChange, buttonClassName = "" }) {
  const inputRef = useRef(null);
  return <div className="tool-file-picker">
    <button type="button" className={`tool-file-button ${buttonClassName}`} onClick={() => inputRef.current?.click()}>{label}</button>
    <input ref={inputRef} id={id} type="file" accept={accept} onChange={onChange} aria-label={inputLabel} hidden />
  </div>;
}
