const countInput = document.getElementById("count");
const binPrefixInput = document.getElementById("binPrefix");
const monthStartInput = document.getElementById("monthStart");
const monthEndInput = document.getElementById("monthEnd");
const yearStartInput = document.getElementById("yearStart");
const yearEndInput = document.getElementById("yearEnd");
const cvcLengthSelect = document.getElementById("cvcLength");
const formatSelect = document.getElementById("formatSelect");
const formatHint = document.getElementById("formatHint");
const output = document.getElementById("output");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const toast = document.getElementById("toast");
const statsCount = document.getElementById("statsCount");

// Yeni Eklenen Gelişmiş Seçenekler
const luhnCheckSelect = document.getElementById("luhnCheck");
const bankSelect = document.getElementById("bankSelect");
const dateLogicSelect = document.getElementById("dateLogic");

let totalGenerated = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDigits(length) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += String(randomInt(0, 9));
  }
  return result;
}

function normalizeTestPrefix(rawValue) {
  const onlyDigits = String(rawValue || "").replace(/\D/g, "");
  const truncated = onlyDigits.slice(0, 15); // Maksimum 15 (16. hane luhn)
  return truncated || "999999";
}

function generateLuhnDigit(partialCard) {
  let sum = 0;
  let alternate = true;
  for (let i = partialCard.length - 1; i >= 0; i--) {
    let n = parseInt(partialCard.substring(i, i + 1), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    sum += n;
    alternate = !alternate;
  }
  return (10 - (sum % 10)) % 10;
}

function fakeCardNumber(prefix, useLuhn) {
  const safePrefix = normalizeTestPrefix(prefix).slice(0, 15);
  const lengthNeeded = 15 - safePrefix.length;
  
  if (!useLuhn) {
    // Luhn kapalıysa tam 16 haneyi rastgele doldur
    return `${safePrefix}${randomDigits(16 - safePrefix.length)}`;
  }

  // Luhn açıksa 15 hane + 1 hane checksum
  const partial = `${safePrefix}${randomDigits(lengthNeeded)}`;
  const checkDigit = generateLuhnDigit(partial);
  return `${partial}${checkDigit}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRange(start, end, min, max) {
  const a = clamp(start, min, max);
  const b = clamp(end, min, max);
  return a <= b ? [a, b] : [b, a];
}

function generateRows() {
  const count = clamp(Number(countInput.value) || 1, 1, 5000);
  const [monthStart, monthEnd] = normalizeRange(
    Number(monthStartInput.value) || 1,
    Number(monthEndInput.value) || 12,
    1,
    12
  );
  const [yearStart, yearEnd] = normalizeRange(
    Number(yearStartInput.value) || 2026,
    Number(yearEndInput.value) || 2032,
    2000,
    2099
  );
  const cvcLength = Number(cvcLengthSelect.value) === 4 ? 4 : 3;
  const prefix = normalizeTestPrefix(binPrefixInput.value);
  const useLuhn = luhnCheckSelect.value === "yes";
  const dateLogic = dateLogicSelect.value;

  countInput.value = String(count);
  binPrefixInput.value = prefix;
  monthStartInput.value = String(monthStart);
  monthEndInput.value = String(monthEnd);
  yearStartInput.value = String(yearStart);
  yearEndInput.value = String(yearEnd);

  const rows = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  for (let i = 0; i < count; i += 1) {
    let finalYear = randomInt(yearStart, yearEnd);
    let finalMonth = randomInt(monthStart, monthEnd);

    // Tarih Mantığı (Valid/Expired) Zorlaması
    if (dateLogic === "future") {
      // Eğer geçmiş yıl geldiyse veya bu yıl olup ay gerideyse, geleceğe zorla
      if (finalYear < currentYear || (finalYear === currentYear && finalMonth < currentMonth)) {
        finalYear = randomInt(currentYear + 1, currentYear + 5);
        finalMonth = randomInt(1, 12);
      }
    } else if (dateLogic === "past") {
      // Eğer gelecek yıl geldiyse veya bu yıl olup ay ilerdeyse, geçmişe zorla
      if (finalYear > currentYear || (finalYear === currentYear && finalMonth >= currentMonth)) {
        finalYear = randomInt(currentYear - 5, currentYear - 1);
        finalMonth = randomInt(1, 12);
      }
    }

    const monthStr = String(finalMonth).padStart(2, "0");
    const yearStr = String(finalYear);
    const cvc = randomDigits(cvcLength);
    const card = fakeCardNumber(prefix, useLuhn);
    
    rows.push({
      card,
      month: monthStr,
      year: yearStr,
      cvc
    });
  }
  return rows;
}

// Banka Şablonu Değişimi
bankSelect.addEventListener("change", (e) => {
  if (e.target.value !== "custom") {
    binPrefixInput.value = e.target.value;
    
    // Amex (37 ile başlar) seçilirse otomatik 4 hane CVC yap
    if (e.target.value === "3772") {
      cvcLengthSelect.value = "4";
    } else {
      cvcLengthSelect.value = "3";
    }
  } else {
    binPrefixInput.value = "";
    binPrefixInput.focus();
  }
});

function formatData(data, formatType) {
  if (formatType === "json") {
    formatHint.textContent = "Format: JSON Array";
    return JSON.stringify(data, null, 2);
  } 
  
  if (formatType === "csv") {
    formatHint.textContent = "Format: KartNo,Ay,Yil,CVC";
    const header = "KartNo,Ay,Yil,CVC";
    const body = data.map(d => `${d.card},${d.month},${d.year},${d.cvc}`).join("\n");
    return `${header}\n${body}`;
  }

  // Default: pipe
  formatHint.textContent = "Format: kart_numarası|AA|YYYY|CVC";
  return data.map(d => `${d.card}|${d.month}|${d.year}|${d.cvc}`).join("\n");
}

function updateStats(count) {
  totalGenerated += count;
  statsCount.textContent = totalGenerated.toLocaleString();
  
  // Animation effect on badge
  const badge = statsCount.parentElement;
  badge.style.transform = "scale(1.1)";
  badge.style.borderColor = "var(--primary)";
  setTimeout(() => {
    badge.style.transform = "scale(1)";
    badge.style.borderColor = "var(--border)";
  }, 200);
}

generateBtn.addEventListener("click", () => {
  const data = generateRows();
  output.value = formatData(data, formatSelect.value);
  updateStats(data.length);
  showToast(`${data.length} adet veri üretildi!`);
});

formatSelect.addEventListener("change", () => {
  if (!output.value) return;
  // If there's already output, we regenerate using the same inputs to change format instantly
  const data = generateRows();
  output.value = formatData(data, formatSelect.value);
});

copyBtn.addEventListener("click", async () => {
  if (!output.value.trim()) {
    showToast("Kopyalanacak veri yok!");
    return;
  }
  try {
    await navigator.clipboard.writeText(output.value);
    showToast("Kopyalandı!");
  } catch (err) {
    showToast("Kopyalama başarısız!");
  }
});

downloadBtn.addEventListener("click", () => {
  if (!output.value.trim()) {
    showToast("İndirilecek veri yok!");
    return;
  }
  
  const formatType = formatSelect.value;
  let extension = "txt";
  let mimeType = "text/plain";
  
  if (formatType === "json") {
    extension = "json";
    mimeType = "application/json";
  } else if (formatType === "csv") {
    extension = "csv";
    mimeType = "text/csv";
  }

  const blob = new Blob([output.value], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `test-cards.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`Dosya indirildi: test-cards.${extension}`);
});

clearBtn.addEventListener("click", () => {
  output.value = "";
  totalGenerated = 0;
  statsCount.textContent = "0";
  showToast("Temizlendi!");
});
