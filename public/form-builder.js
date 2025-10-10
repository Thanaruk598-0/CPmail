let fieldCount = 0;

const addFieldBtn = document.getElementById("addFieldBtn");
const formFieldsContainer = document.getElementById("formFieldsContainer");
const previewContainer = document.getElementById("formPreview");
const fieldsInput = document.getElementById("fieldsInput");

// --------------------
// โหลด fields ที่มีอยู่แล้ว (แก้ไข)
// --------------------
if (typeof initialFields !== "undefined" && initialFields.length > 0) {
  initialFields.forEach(f => {
    fieldCount++;
    renderField(fieldCount, f);
  });
  updateFieldsInput();
}

// --------------------
// ปุ่ม Add Field
// --------------------
addFieldBtn.addEventListener("click", () => {
  fieldCount++;
  renderField(fieldCount, {
    label: "",
    placeholder: "",
    type: "text",
    required: false
  });
  updateFieldsInput();
});

// --------------------
// ฟังก์ชัน Render Field
// --------------------
function renderField(id, f) {
  const fieldHTML = `
    <div class="border p-3 mb-3 bg-light rounded" id="field-${id}">
      <div class="d-flex justify-content-between">
        <h6>Field ${id}</h6>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeField(${id})">❌ Remove</button>
      </div>
      <div class="mb-2">
        <label class="form-label">Field Label</label>
        <input type="text" class="form-control field-label" value="${f.label || ''}" placeholder="Enter field label">
      </div>
      <div class="mb-2">
        <label class="form-label">Placeholder / Options (optional)</label>
        <textarea class="form-control field-placeholder" rows="2" placeholder="ใส่ข้อความ หรือใส่หลายบรรทัดเพื่อทำเป็นตัวเลือก">${f.placeholder || ''}</textarea>
      </div>

      <div class="mb-2">
        <label class="form-label">Field Type</label>
        <select class="form-select field-type" data-id="${id}">
          <option value="text" ${f.type === "text" ? "selected" : ""}>📝 Text Input</option>
          <option value="textarea" ${f.type === "textarea" ? "selected" : ""}>📄 Text Area</option>
          <option value="email" ${f.type === "email" ? "selected" : ""}>✉️ Email</option>
          <option value="number" ${f.type === "number" ? "selected" : ""}>🔢 Number</option>
          <option value="date" ${f.type === "date" ? "selected" : ""}>📅 Date</option>
          <option value="dropdown" ${f.type === "dropdown" ? "selected" : ""}>📋 Dropdown</option>
          <option value="radio" ${f.type === "radio" ? "selected" : ""}>⚪ Radio Buttons</option>
          <option value="checkbox" ${f.type === "checkbox" ? "selected" : ""}>☑️ Checkboxes</option>
          <option value="file" ${f.type === "file" ? "selected" : ""}>📎 File Upload</option>
        </select>
      </div>
      <div class="form-check">
        <input type="checkbox" class="form-check-input field-required" ${f.required ? "checked" : ""}>
        <label class="form-check-label">Required field</label>
      </div>
    </div>
  `;
  formFieldsContainer.insertAdjacentHTML("beforeend", fieldHTML);

  // Preview
  const previewHTML = `
    <div class="mb-2" id="preview-${id}">
      <label class="form-label">${f.label || "Field " + id}</label>
      <input type="text" class="form-control" disabled>
    </div>
  `;
  previewContainer.insertAdjacentHTML("beforeend", previewHTML);

  // bind event type → update preview
  const fieldTypeSelect = document.querySelector(`#field-${id} .field-type`);
  fieldTypeSelect.addEventListener("change", (e) => {
    updatePreview(id, e.target.value);
  });

  // render preview ตาม type
  updatePreview(id, f.type || "text");
}

// --------------------
// ✅ Update Hidden Input (แก้)
// --------------------
function updateFieldsInput() {
  const fields = [];
  for (let i = 1; i <= fieldCount; i++) {
    const fieldEl = document.getElementById(`field-${i}`);
    if (fieldEl) {
      const rawPlaceholder = fieldEl.querySelector(".field-placeholder").value;
      const options = rawPlaceholder
        .split("\n")
        .map(o => o.trim())
        .filter(o => o !== "");

      fields.push({
        label: fieldEl.querySelector(".field-label").value,
        placeholder: rawPlaceholder,
        type: fieldEl.querySelector(".field-type").value,
        required: fieldEl.querySelector(".field-required").checked,
        options: options
      });
    }
  }
  fieldsInput.value = JSON.stringify(fields);
}

// --------------------
// ✅ Update Preview (แก้)
// --------------------
function updatePreview(id, type) {
  const previewEl = document.getElementById(`preview-${id}`);
  if (!previewEl) return;

  const fieldEl = document.getElementById(`field-${id}`);
  const rawPlaceholder = fieldEl.querySelector(".field-placeholder").value;
  const options = rawPlaceholder
    .split("\n")
    .map(o => o.trim())
    .filter(o => o !== "");

  let inputHTML = "";
  switch (type) {
    case "textarea":
      inputHTML = `<textarea class="form-control" disabled></textarea>`;
      break;
    case "email":
      inputHTML = `<input type="email" class="form-control" disabled>`;
      break;
    case "number":
      inputHTML = `<input type="number" class="form-control" disabled>`;
      break;
    case "date":
      inputHTML = `<input type="date" class="form-control" disabled>`;
      break;
    case "dropdown":
      inputHTML = `<select class="form-select" disabled>` +
        (options.length > 0
          ? options.map(o => `<option>${o}</option>`).join("")
          : `<option>Option 1</option>`) +
        `</select>`;
      break;
    case "radio":
      inputHTML = options.length > 0
        ? options.map(o => `<div><input type="radio" disabled> ${o}</div>`).join("")
        : `<div><input type="radio" disabled> Option 1</div>`;
      break;
    case "checkbox":
      inputHTML = options.length > 0
        ? options.map(o => `<div><input type="checkbox" disabled> ${o}</div>`).join("")
        : `<div><input type="checkbox" disabled> Option 1</div>`;
      break;
    case "file":
      inputHTML = `<input type="file" class="form-control" disabled>`;
      break;
    default:
      inputHTML = `<input type="text" class="form-control" disabled>`;
  }

  previewEl.innerHTML = `
    <label class="form-label">Field ${id}</label>
    ${inputHTML}
  `;
}

// --------------------
// Remove Field
// --------------------
window.removeField = function (id) {
  const field = document.getElementById(`field-${id}`);
  const preview = document.getElementById(`preview-${id}`);
  if (field) field.remove();
  if (preview) preview.remove();
  updateFieldsInput();
};

// --------------------
// Before submit form
// --------------------
const form = document.querySelector("form");
form.addEventListener("submit", () => {
  updateFieldsInput();
});
