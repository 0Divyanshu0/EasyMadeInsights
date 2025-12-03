export default function FileUpload({ handleFile }) {
  return (
    <div className="upload-box">
      <p className="upload-title">Upload Your Excel File</p>
      <p className="upload-sub">Supports .xlsx and .xls (multiple sheets)</p>

      <input 
        type="file" 
        accept=".xlsx,.xls" 
        onChange={handleFile}
        className="upload-input"
      />
    </div>
  );
}
