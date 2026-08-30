        (function() {
            'use strict';
            
            console.log('Script starting...');
            
            // Configuration
            const SUPABASE_URL = 'https://dorkygsgobhcagtqydjb.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcmt5Z3Nnb2JoY2FndHF5ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTc0MzcsImV4cCI6MjA3NjY3MzQzN30.bNCo8Ijj2DIr-c34P7U-lb6QK69D8OzO2sCd6SOwaW0';

            let currentStudentId = '';
            let currentCheckins = [];
            let instructorCache = {};
            let isPrinting = false;
            let missingICInstructors = new Set();

            // Wait for DOM to be ready
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOM loaded, initializing...');
                
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
                
                console.log('Initialization complete');
            });

            /**
             * Handle search - called from onclick
             */
            window.handleSearch = function() {
                console.log('handleSearch called');
                searchStudent();
            };

            /**
             * Handle clear - called from onclick
             */
            window.handleClear = function() {
                console.log('handleClear called');
                clearSearch();
            };

            /**
             * Handle print - called from onclick
             */
            window.handlePrint = function() {
                console.log('handlePrint called');
                printRecord();
            };

            /**
             * Handle close print modal - called from onclick
             */
            window.handleClosePrintModal = function() {
                console.log('handleClosePrintModal called');
                closePrintModal();
            };

            /**
             * Handle confirm print - called from onclick
             */
            window.handleConfirmPrint = function() {
                console.log('handleConfirmPrint called');
                confirmPrint();
            };

            /**
             * Search for student records
             */
            async function searchStudent() {
                console.log('searchStudent called');
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
                missingICInstructors = new Set();
                
                // Show loading
                document.getElementById('loading-state').classList.remove('hidden');
                document.getElementById('form-container').classList.add('hidden');
                document.getElementById('no-results').classList.add('hidden');
                document.getElementById('print-btn').disabled = true;

                try {
                    // Fetch check-ins and instructor data in parallel
                    const [checkins, instructors] = await Promise.all([
                        fetchStudentCheckins(studentId),
                        fetchAllInstructors()
                    ]);
                    
                    console.log('Fetched checkins:', checkins);
                    console.log('Fetched instructors:', instructors);
                    
                    // Cache instructors
                    instructorCache = instructors;
                    
                    // Map instructor ICs to checkins
                    const checkinsWithInstructor = checkins.map(checkin => {
                        const instructor = instructorCache[checkin.instructor_id];
                        let instructorIc = checkin.instructor_id; // fallback to instructor_id
                        let hasIC = false;
                        
                        if (instructor) {
                            // Check if icno exists and is not empty
                            if (instructor.icno && instructor.icno.trim() !== '') {
                                instructorIc = instructor.icno;
                                hasIC = true;
                            } else {
                                // Track instructors missing IC
                                missingICInstructors.add(checkin.instructor_id);
                            }
                        } else {
                            // Instructor not found in agents table
                            missingICInstructors.add(checkin.instructor_id);
                        }
                        
                        console.log(`Instructor ${checkin.instructor_id}: IC=${instructorIc}, hasIC=${hasIC}`);
                        
                        return {
                            ...checkin,
                            instructor_ic: instructorIc,
                            instructor_name: instructor ? instructor.name : checkin.instructor_id,
                            has_instructor_ic: hasIC
                        };
                    });
                    
                    console.log('Checkins with instructor IC:', checkinsWithInstructor);
                    console.log('Missing IC instructors:', Array.from(missingICInstructors));
                    
                    currentCheckins = checkinsWithInstructor;
                    
                    if (checkinsWithInstructor.length === 0) {
                        document.getElementById('loading-state').classList.add('hidden');
                        document.getElementById('no-results').classList.remove('hidden');
                        return;
                    }

                    // Show warning if any instructors are missing IC
                    if (missingICInstructors.size > 0) {
                        showMissingICWarning(Array.from(missingICInstructors));
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
             * Show warning for missing instructor IC
             */
            function showMissingICWarning(instructors) {
                const container = document.getElementById('form-container');
                const existingWarning = container.querySelector('.warning-banner');
                if (existingWarning) existingWarning.remove();
                
                const warning = document.createElement('div');
                warning.className = 'warning-banner no-print';
                warning.innerHTML = `
                    <strong>⚠️ Warning:</strong> The following instructors do not have IC numbers registered:<br>
                    <strong>${instructors.join(', ')}</strong><br>
                    <span style="font-size:10px; color:#78350f;">Please update the instructor's IC number in the agents table.</span>
                `;
                container.insertBefore(warning, container.firstChild);
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
                        console.warn('Failed to fetch instructors, status:', response.status);
                        return {};
                    }

                    const data = await response.json();
                    console.log('Raw instructor data from agents table:', data);
                    
                    const map = {};
                    data.forEach(agent => {
                        map[agent.instructor_id] = {
                            icno: agent.icno || '',
                            name: agent.agent_name
                        };
                        console.log(`Mapped instructor ${agent.instructor_id} -> IC: "${agent.icno}"`);
                    });
                    return map;
                } catch (error) {
                    console.error('Error fetching instructors:', error);
                    return {};
                }
            }

            /**
             * Populate the full KPP03 form with fixed height cells
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
                        const hasIC = checkin.has_instructor_ic || false;
                        
                        // Use different styling if IC is missing
                        const icCellClass = hasIC ? 'filled-cell' : 'missing-ic';
                        const icDisplay = hasIC ? instructorIc : `${instructorIc} ⚠️`;
                        
                        lessonHtml += `
                            <tr>
                                <td class="filled-cell">${formattedDate}</td>
                                <td class="filled-cell">${checkin.start_time || '-'}</td>
                                <td class="filled-cell">${checkin.end_time || '-'}</td>
                                <td class="filled-cell">${checkin.car_plate || '-'}</td>
                                <td class="filled-cell">${checkin.duration || 0}</td>
                                <td class="filled-cell"><strong>KPP03</strong></td>
                                <td class="filled-cell signature-cell"></td>
                                <td class="${icCellClass}">${icDisplay}</td>
                                <td class="filled-cell signature-cell"></td>
                            </tr>
                        `;
                    } else {
                        lessonHtml += `
                            <tr>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
                                <td class="empty-cell"></td>
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
                        <tr>
                            <td class="empty-cell"></td>
                            <td class="empty-cell"></td>
                            <td class="empty-cell"></td>
                            <td class="empty-cell"></td>
                            <td class="empty-cell"></td>
                            <td colspan="2" class="empty-cell"></td>
                            <td class="empty-cell"></td>
                            <td class="empty-cell"></td>
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
                missingICInstructors = new Set();
                
                // Remove warning banner
                const warning = document.querySelector('.warning-banner');
                if (warning) warning.remove();
                
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

            console.log('Script loaded, functions registered on window');
            
        })();
