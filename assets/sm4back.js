<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#290C73">
    <title>KPP03 Student Record</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        * {
            -webkit-tap-highlight-color: transparent;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: #f3f4f6;
        }
        
        .safe-top {
            padding-top: env(safe-area-inset-top);
        }
        
        .safe-bottom {
            padding-bottom: env(safe-area-inset-bottom);
        }
        
        .form-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .input-mobile {
            font-size: 16px;
            padding: 14px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            width: 100%;
            transition: all 0.2s ease;
            background: #ffffff;
        }
        
        .input-mobile:focus {
            outline: none;
            border-color: #FACC15;
            box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.1);
        }
        
        .btn-primary-mobile {
            background: #FACC15;
            color: #290C73;
            font-size: 17px;
            font-weight: 600;
            padding: 16px 24px;
            border-radius: 12px;
            border: none;
            width: 100%;
            min-height: 56px;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 4px 0 0 #d4a000;
            position: relative;
            transform: translateY(0);
        }
        
        .btn-primary-mobile:active {
            transform: translateY(3px);
            box-shadow: 0 1px 0 0 #d4a000;
        }
        
        .btn-primary-mobile:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .btn-secondary-mobile {
            background: #e5e7eb;
            color: #1f2937;
            font-size: 17px;
            font-weight: 600;
            padding: 16px 24px;
            border-radius: 12px;
            border: none;
            width: 100%;
            min-height: 56px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        
        .btn-secondary-mobile:active {
            background: #d1d5db;
        }
        
        .kpp03-form {
            font-size: 12px;
            line-height: 1.4;
        }
        
        .kpp03-form .title {
            font-size: 14px;
            font-weight: 700;
            text-align: center;
            padding: 8px 0;
            background: #f9fafb;
            border: 1px solid #000;
        }
        
        .kpp03-form table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        
        .kpp03-form table th,
        .kpp03-form table td {
            border: 1px solid #000;
            padding: 4px 3px;
            text-align: center;
            vertical-align: middle;
        }
        
        .kpp03-form table th {
            background: #f3f4f6;
            font-weight: 600;
        }
        
        .kpp03-form .section-title {
            font-weight: 700;
            text-align: center;
            padding: 6px;
            border: 1px solid #000;
            background: #f9fafb;
        }
        
        .kpp03-form .declaration-text {
            font-size: 11px;
            line-height: 1.6;
            padding: 8px;
        }
        
        .kpp03-form .signature-line {
            display: inline-block;
            min-width: 150px;
            border-bottom: 1px solid #000;
            margin: 0 4px;
            height: 20px;
        }
        
        .kpp03-form .signature-block {
            padding: 6px 8px;
            font-size: 11px;
        }
        
        .kpp03-form .checkbox-group {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 4px 12px;
        }
        
        .kpp03-form .checkbox-group input[type="checkbox"] {
            margin-top: 2px;
            width: 16px;
            height: 16px;
            accent-color: #290C73;
            flex-shrink: 0;
        }
        
        .kpp03-form .checkbox-group label {
            cursor: pointer;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .search-section {
            max-width: 210mm;
            margin: 0 auto 16px;
        }
        
        @media print {
            body {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            
            .no-print {
                display: none !important;
            }
            
            .form-container {
                box-shadow: none !important;
                padding: 10px 15px !important;
                max-width: 100% !important;
            }
            
            .kpp03-form {
                font-size: 10px !important;
            }
            
            .kpp03-form table {
                font-size: 9px !important;
            }
            
            .kpp03-form table th,
            .kpp03-form table td {
                padding: 3px 2px !important;
            }
            
            .kpp03-form .title {
                font-size: 12px !important;
                padding: 4px 0 !important;
            }
            
            .kpp03-form .declaration-text {
                font-size: 9px !important;
                padding: 4px !important;
            }
            
            .kpp03-form .signature-block {
                padding: 3px 4px !important;
                font-size: 9px !important;
            }
            
            .kpp03-form .checkbox-group label {
                font-size: 9px !important;
            }
            
            .kpp03-form .checkbox-group input[type="checkbox"] {
                width: 12px !important;
                height: 12px !important;
            }
            
            .kpp03-form .signature-line {
                min-width: 80px !important;
                height: 14px !important;
            }
            
            @page {
                size: A4 portrait;
                margin: 10mm 8mm;
            }
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .spinner {
            animation: spin 1s linear infinite;
        }
        
        .modal-backdrop {
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        }
        
        .modal-mobile {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-radius: 20px 20px 0 0;
            padding: 24px;
            padding-bottom: calc(24px + env(safe-area-inset-bottom));
            transform: translateY(100%);
            transition: transform 0.3s ease;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .modal-mobile.active {
            transform: translateY(0);
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen safe-top safe-bottom">
    
    <!-- Header -->
    <header class="bg-[#290C73] text-white px-4 py-3 sticky top-0 z-40 shadow-lg no-print">
        <div class="flex items-center justify-between max-w-4xl mx-auto">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <span class="text-xs font-bold">ADC</span>
                </div>
                <div>
                    <h1 class="text-base font-bold leading-tight">KPP03 Student Record</h1>
                    <p class="text-xs opacity-80">Lesson & Assessment Form</p>
                </div>
            </div>
            <button onclick="window.location.href='index.html'" 
                    class="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Back to check-in">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
            </button>
        </div>
    </header>

    <!-- Search Section -->
    <div class="search-section px-4 py-4 no-print">
        <div class="bg-white rounded-xl shadow-sm p-4">
            <div class="space-y-3">
                <div>
                    <label for="search-student-id" class="text-sm font-semibold text-gray-700 block mb-1">
                        Student IC / Passport Number
                    </label>
                    <input type="text" 
                           id="search-student-id" 
                           class="input-mobile"
                           placeholder="e.g., 990101012345"
                           autocomplete="off"
                           oninput="this.value = this.value.toUpperCase()">
                </div>
                
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="handleSearch()" 
                            class="btn-primary-mobile flex items-center justify-center gap-2 text-sm py-3 min-h-[48px]">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        Search
                    </button>
                    <button onclick="handleClear()" 
                            class="btn-secondary-mobile flex items-center justify-center gap-2 text-sm py-3 min-h-[48px]">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Clear
                    </button>
                    <button onclick="handlePrint()" 
                            id="print-btn"
                            class="btn-secondary-mobile flex items-center justify-center gap-2 text-sm py-3 min-h-[48px] bg-[#290C73] text-white hover:bg-[#1e0854] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                        </svg>
                        Print
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading State -->
    <div id="loading-state" class="hidden px-4">
        <div class="bg-white rounded-xl shadow-sm p-8 text-center max-w-4xl mx-auto">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#290C73] border-t-transparent"></div>
            <p class="text-gray-500 mt-4">Loading student records...</p>
        </div>
    </div>

    <!-- No Results -->
    <div id="no-results" class="hidden px-4">
        <div class="bg-white rounded-xl shadow-sm p-8 text-center max-w-4xl mx-auto">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">No Records Found</h3>
            <p class="text-gray-500">No KPP03 lessons found for this student.</p>
        </div>
    </div>

    <!-- KPP03 Form - Matches Image Exactly -->
    <div id="form-container" class="form-container hidden">
        <div class="kpp03-form" id="kpp03-form">
            <!-- Title -->
            <div class="title">KPP 03 (INSTITUT MEMANDU / SEKOLAH MEMANDU)</div>
            
            <!-- Main Lesson Table -->
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="width:12%;">TARIKH</th>
                        <th colspan="2" style="width:16%;">MASA</th>
                        <th rowspan="2" style="width:12%;">NOMBOR<br>KENDERAAN</th>
                        <th rowspan="2" style="width:10%;">JUMLAH<br>JAM<br>BELAJAR</th>
                        <th rowspan="2" style="width:12%;">MODUL<br>PELAJARAN</th>
                        <th rowspan="2" style="width:12%;">T/TANGAN<br>PELAJAR</th>
                        <th colspan="2" style="width:16%;">PENGAJAR</th>
                    </tr>
                    <tr>
                        <th style="width:8%;">MULA</th>
                        <th style="width:8%;">TAMAT</th>
                        <th style="width:8%;">NO. KP</th>
                        <th style="width:8%;">T/TANGAN</th>
                    </tr>
                </thead>
                <tbody id="lesson-rows">
                    <!-- 10 rows populated by JavaScript -->
                </tbody>
            </table>
            
            <!-- Student Declaration -->
            <div style="border:1px solid #000; border-top:none;">
                <div style="font-weight:700; padding:6px; text-align:center; border-bottom:1px solid #000; background:#f9fafb;">
                    PENGAKUAN PELAJAR
                </div>
                <div class="declaration-text">
                    Saya mengaku dengan sesungguhnya telah mengikuti latihan<br>
                    dan pengajaran mengikut jumlah jam di atas
                </div>
                <div class="signature-block">
                    T/tangan : <span class="signature-line"></span><br>
                    Nama : <span class="signature-line"></span><br>
                    Tarikh : <span class="signature-line"></span>
                </div>
            </div>
            
            <!-- Chief Instructor Declaration -->
            <div style="border:1px solid #000; border-top:none;">
                <div style="font-weight:700; padding:6px; text-align:center; border-bottom:1px solid #000; background:#f9fafb;">
                    PENGAKUAN KETUA PENGAJAR
                </div>
                <div class="declaration-text">
                    Saya dengan ini mengesahkan bahawa pelajar ini telah<br>
                    mengikuti latihan dan pengajaran yang dikendalikan oleh<br>
                    pengajar-pengajar yang bertandatangan di atas
                </div>
                <div class="signature-block">
                    T/tangan : <span class="signature-line"></span><br>
                    Nama : <span class="signature-line"></span><br>
                    Tarikh : <span class="signature-line"></span>
                </div>
            </div>
            
            <!-- Competency Assessment -->
            <div style="border:1px solid #000; border-top:none;">
                <div style="font-weight:700; padding:6px; text-align:center; border-bottom:1px solid #000; background:#f9fafb;">
                    PENILAIAN KEKOMPETENAN MEMANDU (INSTITUT MEMANDU SAHAJA)
                </div>
                <table style="border-bottom:none;">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width:12%;">TARIKH</th>
                            <th colspan="2" style="width:16%;">MASA</th>
                            <th rowspan="2" style="width:12%;">NOMBOR<br>KENDERAAN</th>
                            <th rowspan="2" style="width:10%;">JUMLAH<br>JAM<br>PENILAIAN</th>
                            <th colspan="2" rowspan="2" style="width:20%;">MODUL KPP 02 &amp;<br>KPP 03</th>
                            <th rowspan="2" style="width:12%;">T/TANGAN<br>PELAJAR</th>
                            <th rowspan="2" style="width:12%;">NO. KP<br>PEGAWAI PENILAI</th>
                        </tr>
                        <tr>
                            <th style="width:8%;">MULA</th>
                            <th style="width:8%;">TAMAT</th>
                        </tr>
                    </thead>
                    <tbody id="assessment-rows">
                        <!-- 2 rows populated by JavaScript -->
                    </tbody>
                </table>
            </div>
            
            <!-- Assessment Officer Declaration -->
            <div style="border:1px solid #000; border-top:none;">
                <div style="font-weight:700; padding:6px; text-align:center; border-bottom:1px solid #000; background:#f9fafb;">
                    PERAKUAN PEGAWAI PENILAI INSTITUT MEMANDU
                </div>
                <div class="declaration-text">
                    Saya telah menguji dan menilai kemahiran memandu bagi pelajar di atas dan mengesahkan pelajar
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="declaration-competency">
                    <label for="declaration-competency">Layak untuk menduduki ujian kekompetenan memandu yang dikendalikan oleh JPJ</label>
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="declaration-retraining">
                    <label for="declaration-retraining">Perlu latihan KPP02 atau/dan KPP03 dan ujian kelayakan/penilaian semula sebelum layak menduduki ujian kekompetenan memandu</label>
                </div>
                <div class="signature-block">
                    T/tangan : <span class="signature-line"></span><br>
                    Nama Pegawai Penilai : <span class="signature-line"></span><br>
                    Tarikh : <span class="signature-line"></span>
                </div>
            </div>
            
            <!-- Institute Declaration -->
            <div style="border:1px solid #000; border-top:none;">
                <div style="font-weight:700; padding:6px; text-align:center; border-bottom:1px solid #000; background:#f9fafb;">
                    PERAKUAN INSTITUT MEMANDU
                </div>
                <div class="declaration-text">
                    Saya faham sekiranya pengakuan saya tidak benar, saya boleh dikenakan tindakan di bawah Seksyen 108 Akta Pengangkutan Jalan<br>
                    1987 yang membawa kepada denda tidak melebihi RM5,000 atau penjara selama tempoh tidak melebihi satu (1) tahun atau kedua-<br>
                    duanya sekali.
                </div>
                <div class="signature-block" style="display:flex; flex-wrap:wrap; justify-content:space-between;">
                    <div>
                        T/tangan : <span class="signature-line"></span><br>
                        Tarikh : <span class="signature-line"></span>
                    </div>
                    <div>
                        Nama Pengarah/Pengurus : <span class="signature-line"></span><br>
                        Cop Syarikat : <span class="signature-line"></span>
                    </div>
                </div>
            </div>
            
            <!-- Page Number -->
            <div style="text-align:center; padding:4px; border:1px solid #000; border-top:none; font-size:11px;">
                2
            </div>
            
            <!-- Payment Section -->
            <div style="border:1px solid #000; border-top:none; padding:8px; text-align:center;">
                <div style="font-weight:700; font-size:12px;">
                    SENARAI PEMBAYARAN BAGI LESEN KERETA/MOTOR
                </div>
                <div style="font-weight:600; font-size:11px;">
                    JENIS LESEN: D/DA/B/B2
                </div>
                <div style="font-size:10px; font-style:italic; margin-top:2px;">
                    (BAGI KEGUNAAN PEJABAT ADC SAHAJA)<br>
                    (SILA TANDAKAN √ SEKIRANYA PEMBAYARAN TELAH DIBUAT)
                </div>
                <div style="display:flex; justify-content:center; gap:20px; font-size:11px; margin-top:6px; flex-wrap:wrap;">
                    <span>KPP01 <span style="display:inline-block; width:20px; height:20px; border:1px solid #000; margin-left:4px; vertical-align:middle;"></span></span>
                    <span>KPP02 <span style="display:inline-block; width:20px; height:20px; border:1px solid #000; margin-left:4px; vertical-align:middle;"></span></span>
                    <span>KPP03 <span style="display:inline-block; width:20px; height:20px; border:1px solid #000; margin-left:4px; vertical-align:middle;"></span></span>
                    <span>PRA UJIAN QTI <span style="display:inline-block; width:20px; height:20px; border:1px solid #000; margin-left:4px; vertical-align:middle;"></span></span>
                    <span>UJIAN AMALI JPJ <span style="display:inline-block; width:20px; height:20px; border:1px solid #000; margin-left:4px; vertical-align:middle;"></span></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Print Modal -->
    <div id="print-modal" class="fixed inset-0 bg-black/50 modal-backdrop hidden z-50" onclick="if(event.target === this) handleClosePrintModal()">
        <div class="modal-mobile" id="print-modal-content">
            <div class="text-center">
                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Print Record</h3>
                <p class="text-gray-600 mb-6">Print the KPP03 lesson record for this student?</p>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="handleClosePrintModal()" 
                            class="py-3 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                        Cancel
                    </button>
                    <button onclick="handleConfirmPrint()" 
                            class="py-3 px-4 bg-[#290C73] text-white font-semibold rounded-lg hover:bg-[#1e0854] transition-colors">
                        Print
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Combined JavaScript -->
    <script>
        // Configuration
        const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

        let currentStudentId = '';
        let currentCheckins = [];
        let instructorCache = {};
        let isPrinting = false;

        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('search-student-id');
            if (searchInput) {
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                    }
                });
            }

            // Auto-search if URL has student_id parameter
            const urlParams = new URLSearchParams(window.location.search);
            const studentId = urlParams.get('student_id');
            if (studentId) {
                document.getElementById('search-student-id').value = studentId;
                handleSearch();
            }
        });

        /**
         * Handle search - called from onclick
         */
        function handleSearch() {
            searchStudent();
        }

        /**
         * Handle clear - called from onclick
         */
        function handleClear() {
            clearSearch();
        }

        /**
         * Handle print - called from onclick
         */
        function handlePrint() {
            printRecord();
        }

        /**
         * Handle close print modal - called from onclick
         */
        function handleClosePrintModal() {
            closePrintModal();
        }

        /**
         * Handle confirm print - called from onclick
         */
        function handleConfirmPrint() {
            confirmPrint();
        }

        /**
         * Search for student records
         */
        async function searchStudent() {
            const studentId = document.getElementById('search-student-id').value.trim().toUpperCase();
            
            if (!studentId) {
                showToast('Please enter a student IC number', 'warning');
                return;
            }

            if (studentId.length < 4) {
                showToast('Please enter at least 4 characters', 'warning');
                return;
            }

            currentStudentId = studentId;
            
            // Show loading
            document.getElementById('loading-state').classList.remove('hidden');
            document.getElementById('form-container').classList.add('hidden');
            document.getElementById('no-results').classList.add('hidden');
            document.getElementById('print-btn').disabled = true;

            try {
                // Fetch check-ins and instructor data in parallel
                const [checkins, instructorMap] = await Promise.all([
                    fetchStudentCheckins(studentId),
                    fetchAllInstructors()
                ]);
                
                // Cache instructors
                instructorCache = instructorMap;
                
                // Map instructor ICs to checkins
                const checkinsWithInstructor = checkins.map(checkin => {
                    const instructor = instructorCache[checkin.instructor_id];
                    return {
                        ...checkin,
                        instructor_ic: instructor ? instructor.icno : checkin.instructor_id,
                        instructor_name: instructor ? instructor.name : checkin.instructor_id
                    };
                });
                
                currentCheckins = checkinsWithInstructor;
                
                if (checkinsWithInstructor.length === 0) {
                    document.getElementById('loading-state').classList.add('hidden');
                    document.getElementById('no-results').classList.remove('hidden');
                    return;
                }

                // Populate the full form
                populateForm(checkinsWithInstructor);
                
                document.getElementById('loading-state').classList.add('hidden');
                document.getElementById('form-container').classList.remove('hidden');
                document.getElementById('print-btn').disabled = false;

            } catch (error) {
                console.error('Error searching:', error);
                document.getElementById('loading-state').classList.add('hidden');
                showToast('Error loading records. Please try again.', 'error');
            }
        }

        /**
         * Fetch student check-ins from Supabase
         */
        async function fetchStudentCheckins(studentId) {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/check_ins?student_id=eq.${encodeURIComponent(studentId)}&session=eq.KPP03&order=timestamp.asc`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch records');
                }

                return await response.json();
            } catch (error) {
                console.error('Error fetching checkins:', error);
                throw error;
            }
        }

        /**
         * Fetch all instructors from agents table
         */
        async function fetchAllInstructors() {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/agents?select=instructor_id,icno,agent_name`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch instructors');
                }

                const data = await response.json();
                const map = {};
                data.forEach(agent => {
                    map[agent.instructor_id] = {
                        icno: agent.icno || agent.instructor_id,
                        name: agent.agent_name
                    };
                });
                return map;
            } catch (error) {
                console.error('Error fetching instructors:', error);
                return {};
            }
        }

        /**
         * Populate the full KPP03 form
         */
        function populateForm(checkins) {
            // Populate lesson rows (10 rows)
            const lessonTbody = document.getElementById('lesson-rows');
            const maxLessonRows = 10;
            let lessonHtml = '';
            
            for (let i = 0; i < maxLessonRows; i++) {
                if (i < checkins.length) {
                    const checkin = checkins[i];
                    const date = new Date(checkin.timestamp);
                    const formattedDate = date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    
                    const instructorIc = checkin.instructor_ic || checkin.instructor_id || '-';
                    
                    lessonHtml += `
                        <tr style="background:#f0fdf4;">
                            <td>${formattedDate}</td>
                            <td>${checkin.start_time || '-'}</td>
                            <td>${checkin.end_time || '-'}</td>
                            <td>${checkin.car_plate || '-'}</td>
                            <td>${checkin.duration || 0}</td>
                            <td><strong>KPP03</strong></td>
                            <td style="min-height:25px;"></td>
                            <td>${instructorIc}</td>
                            <td style="min-height:25px;"></td>
                        </tr>
                    `;
                } else {
                    lessonHtml += `
                        <tr style="background:#f9fafb;">
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                            <td style="color:#9ca3af; font-size:10px;"></td>
                        </tr>
                    `;
                }
            }
            lessonTbody.innerHTML = lessonHtml;

            // Populate assessment rows (2 rows)
            const assessmentTbody = document.getElementById('assessment-rows');
            const maxAssessmentRows = 2;
            let assessmentHtml = '';
            
            for (let i = 0; i < maxAssessmentRows; i++) {
                assessmentHtml += `
                    <tr style="background:#f9fafb;">
                        <td style="color:#9ca3af; font-size:10px;"></td>
                        <td style="color:#9ca3af; font-size:10px;"></td>
                        <td style="color:#9ca3af; font-size:10px;"></td>
                        <td style="color:#9ca3af; font-size:10px;"></td>
                        <td style="color:#9ca3af; font-size:10px;"></td>
                        <td colspan="2" style="color:#9ca3af; font-size:10px;"></td>
                        <td style="color:#9ca3af; font-size:10px;"></td>
                        <td style="color:#9ca3af; font-size:10px;"></td>
                    </tr>
                `;
            }
            assessmentTbody.innerHTML = assessmentHtml;

            // Reset checkboxes
            document.getElementById('declaration-competency').checked = false;
            document.getElementById('declaration-retraining').checked = false;
        }

        /**
         * Clear search results
         */
        function clearSearch() {
            document.getElementById('search-student-id').value = '';
            document.getElementById('form-container').classList.add('hidden');
            document.getElementById('no-results').classList.add('hidden');
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('print-btn').disabled = true;
            currentStudentId = '';
            currentCheckins = [];
            
            // Reset checkboxes
            document.getElementById('declaration-competency').checked = false;
            document.getElementById('declaration-retraining').checked = false;
        }

        /**
         * Print the record
         */
        function printRecord() {
            if (currentCheckins.length === 0) {
                showToast('No records to print', 'warning');
                return;
            }
            if (isPrinting) return;
            showPrintModal();
        }

        /**
         * Show print confirmation modal
         */
        function showPrintModal() {
            const modal = document.getElementById('print-modal');
            modal.classList.remove('hidden');
            const content = modal.querySelector('.modal-mobile');
            if (content) {
                setTimeout(() => content.classList.add('active'), 10);
            }
        }

        /**
         * Close print modal
         */
        function closePrintModal() {
            const modal = document.getElementById('print-modal');
            const content = modal.querySelector('.modal-mobile');
            if (content) {
                content.classList.remove('active');
                setTimeout(() => modal.classList.add('hidden'), 300);
            } else {
                modal.classList.add('hidden');
            }
        }

        /**
         * Confirm and execute print
         */
        function confirmPrint() {
            isPrinting = true;
            closePrintModal();
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    isPrinting = false;
                }, 1000);
            }, 300);
        }

        /**
         * Show toast notification
         */
        function showToast(message, type = 'info') {
            const colors = {
                info: 'bg-blue-100 border-blue-500 text-blue-800',
                success: 'bg-green-100 border-green-500 text-green-800',
                warning: 'bg-amber-100 border-amber-500 text-amber-800',
                error: 'bg-red-100 border-red-500 text-red-800'
            };

            const toast = document.createElement('div');
            toast.className = `fixed top-20 left-4 right-4 z-50 border-l-4 p-4 rounded-lg shadow-lg transition-all duration-300 ${colors[type] || colors.info}`;
            toast.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-1">
                        <p class="text-sm font-medium">${message}</p>
                    </div>
                    <button onclick="this.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100px)';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        // Make functions accessible globally for onclick handlers
        window.handleSearch = handleSearch;
        window.handleClear = handleClear;
        window.handlePrint = handlePrint;
        window.handleClosePrintModal = handleClosePrintModal;
        window.handleConfirmPrint = handleConfirmPrint;
    </script>
</body>
</html>
