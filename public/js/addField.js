let fieldCount = 0;

  const addFieldBtn = document.getElementById("addFieldBtn");
  const formFieldsContainer = document.getElementById("formFieldsContainer");
  const previewContainer = document.getElementById("formPreview");
  const fieldsInput = document.getElementById("fieldsInput");

  addFieldBtn.addEventListener("click", () => {
    fieldCount++;

    // ส่วน Form Fields
    const fieldHTML = `
      <div class="border p-3 mb-3 bg-light rounded" id="field-${fieldCount}">
        <div class="d-flex justify-content-between">
          <h6>Field ${fieldCount}</h6>
          <button type="button" class="btn btn-sm btn-danger" onclick="removeField(${fieldCount})">❌ Remove</button>
        </div>
        <div class="mb-2">
          <label class="form-label">Field Label</label>
          <input type="text" class="form-control field-label" name="fieldLabel-${fieldCount}" placeholder="Enter field label">
        </div>
        <div class="mb-2">
          <label class="form-label">Placeholder (optional)</label>
          <input type="text" class="form-control field-placeholder" name="placeholder-${fieldCount}" placeholder="Placeholder text">
        </div>
        <div class="mb-2">
          <label class="form-label">Field Type</label>
          <select class="form-select field-type" name="fieldType-${fieldCount}" data-id="${fieldCount}">
            <option value="text">📝 Text Input</option>
            <option value="textarea">📄 Text Area</option>
            <option value="email">✉️ Email</option>
            <option value="number">🔢 Number</option>
            <option value="date">📅 Date</option>
            <option value="dropdown">📋 Dropdown</option>
            <option value="radio">⚪ Radio Buttons</option>
            <option value="checkbox">☑️ Checkboxes</option>
            <option value="rating">⭐ Rating Scale</option>
            <option value="file">📎 File Upload</option>
          </select>
        </div>
        <div class="form-check">
          <input type="checkbox" class="form-check-input field-required" name="required-${fieldCount}">
          <label class="form-check-label">Required field</label>
        </div>
      </div>
    `;
    formFieldsContainer.insertAdjacentHTML("beforeend", fieldHTML);

    // ส่วน Form Preview (default = text)
    const previewHTML = `
      <div class="mb-2" id="preview-${fieldCount}">
        <label class="form-label">Field ${fieldCount}</label>
        <input type="text" class="form-control" disabled>
      </div>
    `;
    previewContainer.insertAdjacentHTML("beforeend", previewHTML);

    // bind event ให้ select type อัปเดต preview
    const fieldTypeSelect = document.querySelector(`#field-${fieldCount} .field-type`);
    fieldTypeSelect.addEventListener("change", (e) => {
      updatePreview(fieldCount, e.target.value);
    });

    updateFieldsInput();
  });

  // อัปเดต preview ตาม field type
  function updatePreview(id, type) {
    const previewEl = document.getElementById(`preview-${id}`);
    if (!previewEl) return;

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
        inputHTML = `<select class="form-select" disabled><option>Option 1</option></select>`;
        break;
      case "radio":
        inputHTML = `
          <div>
            <input type="radio" disabled> Option 1
          </div>`;
        break;
      case "checkbox":
        inputHTML = `
          <div>
            <input type="checkbox" disabled> Option 1
          </div>`;
        break;
      case "rating":
        inputHTML = `<div>⭐ ⭐ ⭐ ⭐ ⭐</div>`;
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

  // อัปเดต hidden input JSON
  function updateFieldsInput() {
    const fields = [];
    for (let i = 1; i <= fieldCount; i++) {
      const fieldEl = document.getElementById(`field-${i}`);
      if (fieldEl) {
        fields.push({
          label: fieldEl.querySelector(".field-label").value,
          placeholder: fieldEl.querySelector(".field-placeholder").value,
          type: fieldEl.querySelector(".field-type").value,
          required: fieldEl.querySelector(".field-required").checked,
        });
      }
    }
    fieldsInput.value = JSON.stringify(fields);
  }

  // ลบ field
  window.removeField = function (id) {
    document.getElementById(`field-${id}`).remove();
    document.getElementById(`preview-${id}`).remove();
    updateFieldsInput();
  };

  // ก่อน submit form → update JSON
  const form = document.querySelector("form");
  form.addEventListener("submit", () => {
    updateFieldsInput();
  });
;
