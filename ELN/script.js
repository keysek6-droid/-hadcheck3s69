const SST_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSHyPTTh-spmZLpomLXNiKqKFPUHIWLe74ZfUnWuHoQIKAWHHsuG8s5i7kBooTTt1MP9QzjqF9kyC9J/pub?output=csv';
const SBT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSysA0Ea2atkqSu4fGnw_aYDeZACOb87esXHYdv2mBEkXBx_8COMV8dGED4O0Z5QH-XBMOTP3kW7Po4/pub?output=csv';

let allEvaluationData = [];
let filteredData = []; 
let currentPage = 1;
const rowsPerPage = 10;

async function loadSheetData() {
    // แสดงข้อความระหว่างรอโหลดข้อมูล พร้อมลูกเล่น Animation
    const area = document.getElementById('resultArea');
    area.innerHTML = `
        <div style="text-align:center; padding:40px; font-family:Sarabun;">
            <div class="loader-container">
                <span class="loading-text">กำลังอัปเดตข้อมูล</span>
                <span class="loading-dots">
                    <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                </span>
            </div>
            <style>
                .loader-container {
                    font-size: 20px;
                    color: #003366;
                    font-weight: bold;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 4px;
                }
                .loading-text {
                    animation: pulseText 2s ease-in-out infinite;
                }
                .dot {
                    display: inline-block;
                    animation: bounceDot 1.4s infinite both;
                }
                .dot:nth-child(2) { animation-delay: 0.2s; }
                .dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes pulseText {
                    0%, 100% { opacity: 0.5; transform: scale(0.98); }
                    50% { opacity: 1; transform: scale(1); }
                }
                @keyframes bounceDot {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-8px); }
                }
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
        allEvaluationData = [...parseCSV(sstRes, 'ศสต', 27), ...parseCSV(sbtRes, 'ศบต', 33)];
        
        // สั่งให้ข้อมูลแสดงผลทั้งหมดทันทีหลังโหลดเสร็จ
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
        result.push({
            type: type,
            region: clean(cols[3]),   
            province: clean(cols[4]), 
            unitName: clean(cols[5]), 
            result: clean(cols[resultIndex]) || 'รอกรอกผล'
        });
    }
    return result;
}

function setupFilters() {
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const uniqueRegions = [...new Set(allEvaluationData.map(item => item.region))].filter(r => r).sort((a,b) => a-b);
    
    regionSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    uniqueRegions.forEach(reg => regionSelect.add(new Option(`เขต ${reg}`, reg)));

    regionSelect.addEventListener('change', function() {
        const filteredProvinces = [...new Set(allEvaluationData.filter(item => !this.value || item.region === this.value).map(item => item.province))].filter(p => p).sort();
        provinceSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
        filteredProvinces.forEach(pv => provinceSelect.add(new Option(pv, pv)));
    });
}

function searchData(event) {
    event.preventDefault();
    const selectedType = document.querySelector('input[name="org_type"]:checked').value;
    const selectedRegion = document.getElementById('region').value;
    const selectedProvince = document.getElementById('province').value;

    filteredData = allEvaluationData.filter(item => {
        return (selectedType === 'all' || item.type === selectedType) &&
               (selectedRegion === '' || item.region === selectedRegion) &&
               (selectedProvince === '' || item.province === selectedProvince);
    });
    
    currentPage = 1; 
    displayResults();
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
        <style>
            .table-wrapper { 
                width: 100%; 
                overflow-x: auto; 
                -webkit-overflow-scrolling: touch; 
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }
            .data-table { 
                width: 100%; 
                border-collapse: collapse; 
                min-width: 650px; 
            }
            .data-table th { 
                background-color: #003366; 
                color: white; 
                font-weight: 500;
            }
            @media screen and (max-width: 600px) {
                .pagination-controls button { padding: 10px 15px; font-size: 14px; }
            }
        </style>
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 12%; text-align: center; padding: 12px 5px; font-size: 14px;">ประเภท</th>
                        <th style="width: 43%; text-align: left; padding: 12px 15px; font-size: 14px;">หน่วยงาน</th>
                        <th style="width: 10%; text-align: center; padding: 12px 5px; font-size: 14px;">เขต</th>
                        <th style="width: 18%; text-align: left; padding: 12px 10px; font-size: 14px;">จังหวัด</th>
                        <th style="width: 17%; text-align: center; padding: 12px 10px; font-size: 14px;">ผลประเมิน</th>
                    </tr>
                </thead>
                <tbody>
    `;

    paginatedItems.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        const resultText = item.result ? item.result.trim() : "";

        let statusColor = '#6b7280'; 
        let statusBg = 'rgba(107, 114, 128, 0.1)';
        let statusBorder = 'rgba(107, 114, 128, 0.3)';

        if (resultText.includes('ต้นแบบ')) {
            statusColor = '#16a34a'; 
            statusBg = 'rgba(22, 163, 74, 0.1)';
            statusBorder = 'rgba(22, 163, 74, 0.3)';
        } else if (resultText.includes('ระดับดี')) {
            statusColor = '#ea580c'; 
            statusBg = 'rgba(234, 88, 12, 0.1)';
            statusBorder = 'rgba(234, 88, 12, 0.3)';
        } else if (resultText.includes('ระดับมาตรฐาน')) {
            statusColor = '#b45309'; 
            statusBg = 'rgba(251, 192, 45, 0.15)';
            statusBorder = 'rgba(251, 192, 45, 0.4)';
        } else if (resultText.includes('ต่ำกว่ามาตรฐาน')) {
            statusColor = '#d32f2f'; 
            statusBg = 'rgba(211, 47, 47, 0.1)';
            statusBorder = 'rgba(211, 47, 47, 0.3)';
        } else if (resultText.includes('ยังไม่ดำเนินการ') || resultText.includes('รอกรอกผล')) {
            statusColor = '#6b7280'; 
            statusBg = 'rgba(107, 114, 128, 0.1)';
            statusBorder = 'rgba(107, 114, 128, 0.3)';
        }

        html += `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; text-align: center; font-size: 13px;">${item.type}</td>
                <td style="padding: 12px; font-weight: 600; color: #003366; font-size: 14px;">${item.unitName}</td>
                <td style="padding: 12px; text-align: center; font-size: 13px;">${item.region}</td>
                <td style="padding: 12px; font-size: 13px;">${item.province}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="display:inline-block; padding: 4px 10px; border-radius: 15px; 
                        background: ${statusBg}; 
                        color: ${statusColor}; 
                        border: 1px solid ${statusBorder}; 
                        font-weight: bold; font-size: 12px; white-space: nowrap;">
                        ${resultText}
                    </span>
                </td>
            </tr>`;
    });
    html += `</tbody></table></div>`;

    html += `
        <div class="pagination-controls" style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 15px; flex-wrap: wrap;">
            <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} style="padding: 8px 16px; cursor: pointer; border-radius: 6px; border: 1px solid #ddd; background: #fff; font-family: 'Sarabun'; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">ก่อนหน้า</button>
            <span style="font-size: 14px; font-weight: bold; color: #555; background: #f8f9fa; padding: 6px 12px; border-radius: 20px;">หน้า ${currentPage} / ${totalPages}</span>
            <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 8px 16px; cursor: pointer; border-radius: 6px; border: 1px solid #ddd; background: #fff; font-family: 'Sarabun'; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">ถัดไป</button>
        </div>
    `;

    area.innerHTML = html;

    if (window.innerWidth < 900) {
        area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function changePage(step) {
    currentPage += step;
    displayResults();
    const wrapper = document.querySelector('.table-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
}

document.addEventListener('DOMContentLoaded', () => {
    loadSheetData();
    document.getElementById('searchForm').addEventListener('submit', searchData);
    document.getElementById('searchForm').addEventListener('reset', () => {
        // เมื่อ Reset ให้กลับมาแสดงข้อมูลทั้งหมดเหมือนตอนเริ่มต้น
        filteredData = [...allEvaluationData];
        currentPage = 1;
        displayResults();
        setTimeout(setupFilters, 10);
    });
});
// ฟังก์ชันสำหรับดาวน์โหลดข้อมูล "ทั้งหมด" ที่ค้นหาพบ (รวมทุกหน้า Pagination)
function downloadAllFilteredData() {
    // 1. ตรวจสอบว่ามีข้อมูลจากการค้นหาหรือไม่
    if (!filteredData || filteredData.length === 0) {
        alert("ไม่พบข้อมูลที่จะดาวน์โหลด กรุณาค้นหาข้อมูลก่อน");
        return;
    }

    // 2. กำหนดหัวตาราง (Header)
    const headers = ["ประเภท", "หน่วยงาน", "เขต", "จังหวัด", "ผลประเมิน"];
    const csvRows = [];
    csvRows.push(headers.join(",")); // เพิ่มบรรทัดหัวตาราง

    // 3. วนลูปดึงข้อมูลจาก filteredData ทั้งหมด (ไม่ใช่แค่หน้าปัจจุบัน)
    filteredData.forEach(item => {
        const row = [
            `"${item.type}"`,
            `"${item.unitName}"`,
            `"${item.region}"`,
            `"${item.province}"`,
            `"${item.result.replace(/(\r\n|\n|\r)/gm, " ").trim()}"` // ล้างตัวขึ้นบรรทัดใหม่
        ];
        csvRows.push(row.join(","));
    });

    // 4. จัดการเรื่องภาษาไทย (BOM \uFEFF) เพื่อให้ Excel เปิดแล้วไม่เป็นภาษาต่างดาว
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 5. สร้างชื่อไฟล์ตามเงื่อนไขที่กรอง
    const timestamp = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    const fileName = `รายงาน_3S_ทั้งหมด_${filteredData.length}_รายการ_${timestamp}.csv`;

    // 6. ทำการดาวน์โหลด
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ผูกฟังก์ชันเข้ากับปุ่มดาวน์โหลด (ปรับปรุงจากของเดิม)
document.addEventListener('DOMContentLoaded', () => {
    const btnExport = document.getElementById('btnExport');
    if (btnExport) {
        // เปลี่ยนมาเรียกใช้ฟังก์ชัน downloadAllFilteredData แทน
        btnExport.addEventListener('click', downloadAllFilteredData);
    }
});