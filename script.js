const SST_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSHyPTTh-spmZLpomLXNiKqKFPUHIWLe74ZfUnWuHoQIKAWHHsuG8s5i7kBooTTt1MP9QzjqF9kyC9J/pub?output=csv';
const SBT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4b--rZComvk7MvvpnPRU_B-chB77lHmNhhKzH8Wt2FgVad2XbVzmw5B5UKem3m12r2fOd1_ngF20N/pub?gid=1651992591&single=true&output=csv';

let allEvaluationData = []; 
let masterData = { sst: [], sbt: [] }; 
let filteredData = []; 
let currentPage = 1;
const rowsPerPage = 10;

async function loadSheetData() {
    const area = document.getElementById('resultArea');
    area.innerHTML = `
        <div style="text-align:center; padding:40px; font-family:Sarabun;">
            <div class="loader-container">
                <span class="loading-text">กำลังอัปเดตข้อมูล</span>
                <span class="loading-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
            </div>
            <style>
                .loader-container { font-size: 20px; color: #003366; font-weight: bold; display: flex; justify-content: center; align-items: center; gap: 4px; }
                .dot { display: inline-block; animation: bounceDot 1.4s infinite both; }
                .dot:nth-child(2) { animation-delay: 0.2s; }
                .dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes bounceDot { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
            </style>
        </div>
    `;

    try {
        const sstUrl = `${SST_SHEET_URL}&t=${new Date().getTime()}`;
        const sbtUrl = `${SBT_SHEET_URL}&t=${new Date().getTime()}`;

        const [sstRes, sbtRes] = await Promise.all([
            fetch(sstUrl).then(res => res.text()),
            fetch(sbtUrl).then(res => res.text())
        ]);
        
        masterData.sst = parseCSV(sstRes, 'ศสต', 27);
        masterData.sbt = parseCSV(sbtRes, 'ศบต', 33); 
        
        allEvaluationData = [...masterData.sst, ...masterData.sbt];
        filteredData = [...allEvaluationData];
        
        setupFilters();
        displayResults();

    } catch (error) {
        console.error("Error loading data:", error);
        area.innerHTML = '<p style="text-align:center; color:red; padding:20px;">เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</p>';
    }
}

function parseCSV(csvText, type, resultIndex) {
    const lines = csvText.split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
        
        if (cols.length > 6) {
            const unitNameIndex = 6; 
            result.push({
                type: type,
                region: clean(cols[3]),   
                province: clean(cols[4]), 
                unitName: clean(cols[unitNameIndex]), 
                result: clean(cols[resultIndex]) || 'รอกรอกผล'
            });
        }
    }
    return result;
}

function searchData(event) {
    event.preventDefault();
    const selectedType = document.querySelector('input[name="org_type"]:checked').value;
    const selectedRegion = document.getElementById('region').value;
    const selectedProvince = document.getElementById('province').value;

    let sourceData = [];
    if (selectedType === 'ศสต') sourceData = masterData.sst;
    else if (selectedType === 'ศบต') sourceData = masterData.sbt;
    else sourceData = [...masterData.sst, ...masterData.sbt];

    filteredData = sourceData.filter(item => {
        return (selectedRegion === '' || item.region === selectedRegion) &&
               (selectedProvince === '' || item.province === selectedProvince);
    });
    
    currentPage = 1; 
    displayResults();
}

function setupFilters() {
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const fullData = [...masterData.sst, ...masterData.sbt];
    const uniqueRegions = [...new Set(fullData.map(item => item.region))].filter(r => r).sort((a,b) => a-b);
    
    regionSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    uniqueRegions.forEach(reg => regionSelect.add(new Option(`เขต ${reg}`, reg)));

    regionSelect.addEventListener('change', function() {
        const filteredProvinces = [...new Set(fullData.filter(item => !this.value || item.region === this.value).map(item => item.province))].filter(p => p).sort();
        provinceSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
        filteredProvinces.forEach(pv => provinceSelect.add(new Option(pv, pv)));
    });
}

function displayResults() {
    const area = document.getElementById('resultArea');
    if (filteredData.length === 0) {
        area.innerHTML = '<p style="text-align:center;color:red;padding:20px;">ไม่พบข้อมูล</p>';
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredData.slice(start, end);
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; font-family: Sarabun;">
            <div style="font-size: 14px; color: #666;">
                พบ <span style="font-weight: bold; color: #003366;">${filteredData.length}</span> รายการ
            </div>
            <button onclick="exportToExcel()" style="
                display: flex; align-items: center; gap: 4px;
                background-color: #217346; color: white; border: none;
                padding: 4px 8px; border-radius: 4px; cursor: pointer;
                font-family: 'Sarabun'; font-size: 12px; transition: 0.2s;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1); width: auto;">
                <span style="font-size: 12px;">📊</span> Excel
            </button>
        </div>
        <div class="table-wrapper">
            <style>
                .table-wrapper { width: 100%; overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
                .data-table { width: 100%; border-collapse: collapse; min-width: 650px; }
                .data-table th { background-color: #003366; color: white; padding: 12px; font-size: 14px; }
            </style>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ประเภท</th>
                        <th style="text-align:left;">หน่วยงาน</th>
                        <th>เขต</th>
                        <th style="text-align:left;">จังหวัด</th>
                        <th>ผลประเมิน</th>
                    </tr>
                </thead>
                <tbody>`;

    paginatedItems.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        const resultText = item.result.trim();
        
        // คืนค่าการจัดการสีเหมือนเดิม
        let statusColor = '#6b7280', statusBg = 'rgba(107, 114, 128, 0.1)', statusBorder = 'rgba(107, 114, 128, 0.3)';

        if (resultText.includes('ต้นแบบ')) { statusColor = '#16a34a'; statusBg = 'rgba(22, 163, 74, 0.1)'; statusBorder = 'rgba(22, 163, 74, 0.3)'; }
        else if (resultText.includes('ระดับดี')) { statusColor = '#ea580c'; statusBg = 'rgba(234, 88, 12, 0.1)'; statusBorder = 'rgba(234, 88, 12, 0.3)'; }
        else if (resultText.includes('ระดับมาตรฐาน')) { statusColor = '#b45309'; statusBg = 'rgba(251, 192, 45, 0.15)'; statusBorder = 'rgba(251, 192, 45, 0.4)'; }
        else if (resultText.includes('ต่ำกว่ามาตรฐาน')) { statusColor = '#d32f2f'; statusBg = 'rgba(211, 47, 47, 0.1)'; statusBorder = 'rgba(211, 47, 47, 0.3)'; }

        html += `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px; text-align: center; font-size: 13px;">${item.type}</td>
                <td style="padding: 10px; font-weight: 600; color: #003366; font-size: 14px;">${item.unitName}</td>
                <td style="padding: 10px; text-align: center; font-size: 13px;">${item.region}</td>
                <td style="padding: 10px; font-size: 13px;">${item.province}</td>
                <td style="padding: 10px; text-align: center;">
                    <span style="display:inline-block; padding: 3px 8px; border-radius: 12px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; font-weight: bold; font-size: 11px;">
                        ${resultText}
                    </span>
                </td>
            </tr>`;
    });
    html += `</tbody></table></div>`;
    html += `
        <div class="pagination-controls" style="margin-top: 15px; display: flex; justify-content: center; align-items: center; gap: 12px;">
            <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} style="padding: 4px 10px; font-size: 13px; cursor: pointer;">ก่อนหน้า</button>
            <span style="font-size: 13px;">หน้า ${currentPage} / ${totalPages}</span>
            <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 4px 10px; font-size: 13px; cursor: pointer;">ถัดไป</button>
        </div>`;
    area.innerHTML = html;
}

function changePage(step) { currentPage += step; displayResults(); }

document.addEventListener('DOMContentLoaded', () => {
    loadSheetData();
    document.getElementById('searchForm').addEventListener('submit', searchData);
    document.getElementById('searchForm').addEventListener('reset', () => {
        filteredData = [...masterData.sst, ...masterData.sbt];
        currentPage = 1;
        displayResults();
    });
});

function exportToExcel() {
    if (filteredData.length === 0) return;
    const dataForExcel = filteredData.map(item => ({
        "ประเภท": item.type, "หน่วยงาน": item.unitName, "เขต": item.region, "จังหวัด": item.province, "ผลการประเมิน": item.result
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, `ผลการประเมิน.xlsx`);
}