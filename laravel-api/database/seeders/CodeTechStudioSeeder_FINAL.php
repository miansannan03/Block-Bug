<?php

/*
|--------------------------------------------------------------------------
| BlockBug Seeder Data — Code Tech Studio (Lahore)
|--------------------------------------------------------------------------
| Real organization name/location.
| Users, credentials, projects, bugs and timelines are fictional demo data.
| Activity dates are intentionally scattered from 4 August through 20 September 2026.
*/

return [
    'organization' => [
        'id' => 'org-code-tech-studio',
        'name' => 'Code Tech Studio',
        'login_email' => 'codetech.lahore@blockbug.test',
        'password' => 'CTS@BlockBug2026',
        'status' => 'active',
        'created_at' => '2026-08-02 09:18:00',
    ],

    'users' => [
        ['id' => 'user-cts-admin-01', 'name' => 'Muhammad Hamza', 'email' => 'mhamza.pk91@codetechstudio.com', 'password' => 'CTSAdmin@2026', 'role' => 'admin', 'status' => 'active', 'avatar' => null],
        ['id' => 'user-cts-manager-01', 'name' => 'Areeba Iqbal', 'email' => 'areeba.iqbal22@codetechstudio.com', 'password' => 'CTSManager@2026', 'role' => 'manager', 'status' => 'active', 'avatar' => null],
        ['id' => 'user-cts-dev-01', 'name' => 'Ali Raza', 'email' => 'razaali.dev1@codetechstudio.com', 'password' => 'CTSDev1@2026', 'role' => 'developer', 'status' => 'active', 'avatar' => null],
        ['id' => 'user-cts-dev-02', 'name' => 'Salman Ahmed', 'email' => 'salmanahmed786@codetechstudio.com', 'password' => 'CTSDev2@2026', 'role' => 'developer', 'status' => 'active', 'avatar' => null],
        ['id' => 'user-cts-dev-03', 'name' => 'Usman Farooq', 'email' => 'usman.farooq94@codetechstudio.com', 'password' => 'CTSDev3@2026', 'role' => 'developer', 'status' => 'active', 'avatar' => null],
        ['id' => 'user-cts-tester-01', 'name' => 'Hira Khalid', 'email' => 'hirakhalid07@codetechstudio.com', 'password' => 'CTSTester@2026', 'role' => 'tester', 'status' => 'active', 'avatar' => null],
    ],

    'projects' => [
        ['id' => 'project-mediqueue', 'name' => 'MediQueue Clinic Portal', 'description' => 'Appointment, patient token and doctor schedule portal for a small private clinic in Lahore.', 'project_key' => 'MEDQ', 'status' => 'active', 'team_size' => 5],
        ['id' => 'project-rationmart', 'name' => 'RationMart Inventory & Billing', 'description' => 'Simple inventory, billing, supplier ledger and receipt system for a neighborhood grocery store.', 'project_key' => 'RMI', 'status' => 'active', 'team_size' => 6],
    ],

    'sprints' => [
        ['id' => 'sprint-medq-01', 'project_id' => 'project-mediqueue', 'name' => 'Sprint 01', 'goal' => 'Complete authentication, appointment booking and patient token flow.', 'status' => 'completed', 'start_date' => '2026-08-01', 'end_date' => '2026-08-09', 'created_by' => 'areeba.iqbal22@codetechstudio.com', 'completed_at' => '2026-08-09 17:10:00'],
        ['id' => 'sprint-medq-02', 'project_id' => 'project-mediqueue', 'name' => 'Sprint 02', 'goal' => 'Stabilize doctor schedules, patient editing and appointment reminders.', 'status' => 'completed', 'start_date' => '2026-08-10', 'end_date' => '2026-08-18', 'created_by' => 'areeba.iqbal22@codetechstudio.com', 'completed_at' => '2026-08-18 16:40:00'],
        ['id' => 'sprint-rmi-01', 'project_id' => 'project-rationmart', 'name' => 'Sprint 01', 'goal' => 'Build billing, products, stock movement and invoice printing.', 'status' => 'completed', 'start_date' => '2026-08-03', 'end_date' => '2026-08-12', 'created_by' => 'areeba.iqbal22@codetechstudio.com', 'completed_at' => '2026-08-12 18:05:00'],
        ['id' => 'sprint-rmi-02', 'project_id' => 'project-rationmart', 'name' => 'Sprint 02', 'goal' => 'Improve supplier ledger, loose-item stock handling and Urdu receipt formatting.', 'status' => 'active', 'start_date' => '2026-08-13', 'end_date' => '2026-08-27', 'created_by' => 'areeba.iqbal22@codetechstudio.com', 'completed_at' => null],
    ],

    'bugs' => [
        [
            'id' => 'bug-medq-001', 'title' => 'Patient token number skips after cancellation', 'description' => 'Cancelling the current token causes the next generated patient token to skip a number.', 'status' => 'closed', 'priority' => 'high', 'severity' => 'major', 'project_id' => 'project-mediqueue', 'sprint_id' => 'sprint-medq-01', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => 'razaali.dev1@codetechstudio.com', 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Create three patient tokens\n2. Cancel the active token\n3. Generate the next token", 'expected_result' => 'The next token should continue the sequence without an unnecessary gap.', 'actual_result' => 'The application skips one token number after cancellation.', 'environment' => 'Chrome 127, Windows 11, clinic reception desktop', 'verified_at' => '2026-08-09 14:20:00', 'created_at' => '2026-08-04 10:15:00',
        ],
        [
            'id' => 'bug-medq-002', 'title' => "Doctor schedule shows previous day's slots after refresh", 'description' => 'Refreshing the schedule page can briefly show appointment slots from the previous date.', 'status' => 'resolved', 'priority' => 'medium', 'severity' => 'minor', 'project_id' => 'project-mediqueue', 'sprint_id' => 'sprint-medq-01', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => 'salmanahmed786@codetechstudio.com', 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Open doctor schedule\n2. Change date\n3. Refresh browser", 'expected_result' => 'Only slots for the selected date should be displayed.', 'actual_result' => 'Previous day slots appear until the page data finishes reloading.', 'environment' => 'Edge 127, Windows 11', 'verified_at' => null, 'created_at' => '2026-08-07 12:05:00',
        ],
        [
            'id' => 'bug-medq-003', 'title' => 'Receptionist cannot update patient phone number', 'description' => 'Saving an edited mobile number returns success but the old number remains on the patient profile.', 'status' => 'in-progress', 'priority' => 'medium', 'severity' => 'major', 'project_id' => 'project-mediqueue', 'sprint_id' => 'sprint-medq-02', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => 'usman.farooq94@codetechstudio.com', 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Open a patient profile\n2. Edit phone number\n3. Save changes\n4. Reload profile", 'expected_result' => 'Updated phone number should remain saved.', 'actual_result' => 'Old phone number appears after reload.', 'environment' => 'Chrome 127, Windows 10', 'verified_at' => null, 'created_at' => '2026-08-12 09:40:00',
        ],
        [
            'id' => 'bug-medq-004', 'title' => 'SMS reminder button stays disabled after reschedule', 'description' => 'After an appointment is rescheduled, the manual SMS reminder action remains disabled.', 'status' => 'open', 'priority' => 'low', 'severity' => 'minor', 'project_id' => 'project-mediqueue', 'sprint_id' => 'sprint-medq-02', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => null, 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Open appointment\n2. Change appointment time\n3. Save\n4. Check SMS reminder action", 'expected_result' => 'SMS reminder action should become available for the new appointment time.', 'actual_result' => 'SMS reminder button remains disabled.', 'environment' => 'Chrome 127, Windows 11', 'verified_at' => null, 'created_at' => '2026-08-15 15:25:00',
        ],
        [
            'id' => 'bug-rmi-001', 'title' => 'Discount applied twice when invoice is reopened', 'description' => 'Opening a saved invoice and saving it again can apply the percentage discount for a second time.', 'status' => 'closed', 'priority' => 'critical', 'severity' => 'critical', 'project_id' => 'project-rationmart', 'sprint_id' => 'sprint-rmi-01', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => 'razaali.dev1@codetechstudio.com', 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Create invoice\n2. Apply 10% discount\n3. Save invoice\n4. Reopen and save again", 'expected_result' => 'Discount should remain 10% and should not be recalculated twice.', 'actual_result' => 'Invoice total is reduced again after the second save.', 'environment' => 'Chrome 127, Windows 11, thermal receipt printer connected', 'verified_at' => '2026-08-12 13:30:00', 'created_at' => '2026-08-06 11:20:00',
        ],
        [
            'id' => 'bug-rmi-002', 'title' => 'Stock quantity not reduced for loose items', 'description' => 'Items sold by weight are added to the invoice but stock quantity is not reduced correctly.', 'status' => 'resolved', 'priority' => 'high', 'severity' => 'major', 'project_id' => 'project-rationmart', 'sprint_id' => 'sprint-rmi-01', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => 'salmanahmed786@codetechstudio.com', 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Add loose rice stock\n2. Sell 2.5 kg\n3. Complete invoice\n4. Check remaining stock", 'expected_result' => 'Stock should decrease by the exact sold weight.', 'actual_result' => 'Stock remains unchanged for loose-item sales.', 'environment' => 'Chrome 127, Windows 10', 'verified_at' => null, 'created_at' => '2026-08-09 16:10:00',
        ],
        [
            'id' => 'bug-rmi-003', 'title' => 'Supplier balance differs from purchase ledger', 'description' => 'Supplier summary total does not match the sum of unpaid purchase entries.', 'status' => 'in-progress', 'priority' => 'high', 'severity' => 'major', 'project_id' => 'project-rationmart', 'sprint_id' => 'sprint-rmi-02', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => 'usman.farooq94@codetechstudio.com', 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Create two supplier purchases\n2. Record partial payment\n3. Open supplier balance\n4. Compare with ledger", 'expected_result' => 'Supplier balance and unpaid ledger total should match.', 'actual_result' => 'Summary balance is higher than the remaining ledger amount.', 'environment' => 'Firefox 128, Windows 11', 'verified_at' => null, 'created_at' => '2026-08-13 10:50:00',
        ],
        [
            'id' => 'bug-rmi-004', 'title' => 'Urdu product name breaks printed receipt alignment', 'description' => 'Long Urdu product names push quantity and price columns out of alignment on 80mm receipts.', 'status' => 'open', 'priority' => 'medium', 'severity' => 'minor', 'project_id' => 'project-rationmart', 'sprint_id' => 'sprint-rmi-02', 'reported_by' => 'hirakhalid07@codetechstudio.com', 'assigned_to' => null, 'verification_tester_email' => 'hirakhalid07@codetechstudio.com', 'steps_to_reproduce' => "1. Create product with long Urdu name\n2. Add product to invoice\n3. Print 80mm receipt", 'expected_result' => 'Receipt columns should remain aligned.', 'actual_result' => 'Quantity and price columns shift to the next line.', 'environment' => 'Chrome 127, Windows 11, 80mm thermal printer', 'verified_at' => null, 'created_at' => '2026-08-16 13:45:00',
        ],
    ],

    'activities' => [
        ['id' => 'activity-cts-001', 'bug_id' => 'bug-medq-001', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Created new bug report', 'created_at' => '2026-08-04 10:15:00'],
        ['id' => 'activity-cts-002', 'bug_id' => 'bug-medq-001', 'type' => 'assigned', 'user_id' => 'user-cts-manager-01', 'user_name' => 'Areeba Iqbal', 'message' => 'Assigned bug to Ali Raza', 'created_at' => '2026-08-06 09:20:00'],
        ['id' => 'activity-cts-003', 'bug_id' => 'bug-medq-001', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-01', 'user_name' => 'Ali Raza', 'message' => 'Changed status to in-progress', 'created_at' => '2026-08-10 11:35:00'],
        ['id' => 'activity-cts-004', 'bug_id' => 'bug-medq-001', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-01', 'user_name' => 'Ali Raza', 'message' => 'Changed status to resolved', 'created_at' => '2026-08-18 16:10:00'],
        ['id' => 'activity-cts-005', 'bug_id' => 'bug-medq-001', 'type' => 'verified', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Verified fix and closed the bug', 'created_at' => '2026-08-21 14:20:00'],
        ['id' => 'activity-cts-006', 'bug_id' => 'bug-medq-002', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Created schedule refresh bug', 'created_at' => '2026-08-12 12:05:00'],
        ['id' => 'activity-cts-007', 'bug_id' => 'bug-medq-002', 'type' => 'assigned', 'user_id' => 'user-cts-manager-01', 'user_name' => 'Areeba Iqbal', 'message' => 'Assigned bug to Salman Ahmed', 'created_at' => '2026-08-14 15:40:00'],
        ['id' => 'activity-cts-008', 'bug_id' => 'bug-medq-002', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-02', 'user_name' => 'Salman Ahmed', 'message' => 'Changed status to in-progress', 'created_at' => '2026-08-20 10:30:00'],
        ['id' => 'activity-cts-009', 'bug_id' => 'bug-medq-002', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-02', 'user_name' => 'Salman Ahmed', 'message' => 'Changed status to resolved', 'created_at' => '2026-08-28 17:00:00'],
        ['id' => 'activity-cts-010', 'bug_id' => 'bug-medq-003', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Reported patient phone update issue', 'created_at' => '2026-08-25 09:40:00'],
        ['id' => 'activity-cts-011', 'bug_id' => 'bug-medq-003', 'type' => 'assigned', 'user_id' => 'user-cts-manager-01', 'user_name' => 'Areeba Iqbal', 'message' => 'Assigned bug to Usman Farooq', 'created_at' => '2026-08-29 14:15:00'],
        ['id' => 'activity-cts-012', 'bug_id' => 'bug-medq-003', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-03', 'user_name' => 'Usman Farooq', 'message' => 'Changed status to in-progress', 'created_at' => '2026-09-04 11:10:00'],
        ['id' => 'activity-cts-013', 'bug_id' => 'bug-medq-004', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Reported disabled SMS reminder action', 'created_at' => '2026-09-08 15:25:00'],
        ['id' => 'activity-cts-014', 'bug_id' => 'bug-rmi-001', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Reported duplicate invoice discount issue', 'created_at' => '2026-08-07 11:20:00'],
        ['id' => 'activity-cts-015', 'bug_id' => 'bug-rmi-001', 'type' => 'assigned', 'user_id' => 'user-cts-manager-01', 'user_name' => 'Areeba Iqbal', 'message' => 'Assigned critical billing bug to Ali Raza', 'created_at' => '2026-08-11 09:05:00'],
        ['id' => 'activity-cts-016', 'bug_id' => 'bug-rmi-001', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-01', 'user_name' => 'Ali Raza', 'message' => 'Changed status to in-progress', 'created_at' => '2026-08-17 12:35:00'],
        ['id' => 'activity-cts-017', 'bug_id' => 'bug-rmi-001', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-01', 'user_name' => 'Ali Raza', 'message' => 'Changed status to resolved', 'created_at' => '2026-08-24 15:15:00'],
        ['id' => 'activity-cts-018', 'bug_id' => 'bug-rmi-001', 'type' => 'verified', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Retested invoice flow and closed the bug', 'created_at' => '2026-08-27 13:30:00'],
        ['id' => 'activity-cts-019', 'bug_id' => 'bug-rmi-002', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Reported loose-item stock issue', 'created_at' => '2026-08-18 16:10:00'],
        ['id' => 'activity-cts-020', 'bug_id' => 'bug-rmi-002', 'type' => 'assigned', 'user_id' => 'user-cts-manager-01', 'user_name' => 'Areeba Iqbal', 'message' => 'Assigned bug to Salman Ahmed', 'created_at' => '2026-08-22 10:25:00'],
        ['id' => 'activity-cts-021', 'bug_id' => 'bug-rmi-002', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-02', 'user_name' => 'Salman Ahmed', 'message' => 'Changed status to in-progress', 'created_at' => '2026-09-01 09:15:00'],
        ['id' => 'activity-cts-022', 'bug_id' => 'bug-rmi-002', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-02', 'user_name' => 'Salman Ahmed', 'message' => 'Changed status to resolved', 'created_at' => '2026-09-07 11:45:00'],
        ['id' => 'activity-cts-023', 'bug_id' => 'bug-rmi-003', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Reported supplier balance mismatch', 'created_at' => '2026-09-03 10:50:00'],
        ['id' => 'activity-cts-024', 'bug_id' => 'bug-rmi-003', 'type' => 'assigned', 'user_id' => 'user-cts-manager-01', 'user_name' => 'Areeba Iqbal', 'message' => 'Assigned bug to Usman Farooq', 'created_at' => '2026-09-09 14:40:00'],
        ['id' => 'activity-cts-025', 'bug_id' => 'bug-rmi-003', 'type' => 'status_changed', 'user_id' => 'user-cts-dev-03', 'user_name' => 'Usman Farooq', 'message' => 'Changed status to in-progress', 'created_at' => '2026-09-14 09:55:00'],
        ['id' => 'activity-cts-026', 'bug_id' => 'bug-rmi-004', 'type' => 'created', 'user_id' => 'user-cts-tester-01', 'user_name' => 'Hira Khalid', 'message' => 'Reported Urdu receipt alignment issue', 'created_at' => '2026-09-20 13:45:00'],
    ],

    'comments' => [
        ['id' => 'comment-cts-001', 'bug_id' => 'bug-medq-001', 'parent_comment_id' => null, 'user_email' => 'razaali.dev1@codetechstudio.com', 'user_name' => 'Ali Raza', 'comment' => 'Reproduced. Cancellation is incrementing the counter before the next token is created.', 'created_at' => '2026-08-06 13:05:00'],
        ['id' => 'comment-cts-002', 'bug_id' => 'bug-rmi-001', 'parent_comment_id' => null, 'user_email' => 'razaali.dev1@codetechstudio.com', 'user_name' => 'Ali Raza', 'comment' => 'Discount is being recalculated during invoice hydration. Fix added for retest.', 'created_at' => '2026-08-11 15:20:00'],
        ['id' => 'comment-cts-003', 'bug_id' => 'bug-rmi-003', 'parent_comment_id' => null, 'user_email' => 'usman.farooq94@codetechstudio.com', 'user_name' => 'Usman Farooq', 'comment' => 'Checking partial-payment rounding and opening balance calculation.', 'created_at' => '2026-08-16 12:10:00'],
    ],

    'notifications' => [],

    'audit_logs' => [
        ['actor_type' => 'user', 'actor_id' => 'user-cts-admin-01', 'actor_role' => 'admin', 'action' => 'PROJECT_CREATED', 'entity_type' => 'project', 'entity_id' => 'project-mediqueue', 'succeeded' => true, 'metadata' => ['project_name' => 'MediQueue Clinic Portal'], 'ip_address' => '127.0.0.1', 'request_id' => null],
        ['actor_type' => 'user', 'actor_id' => 'user-cts-admin-01', 'actor_role' => 'admin', 'action' => 'PROJECT_CREATED', 'entity_type' => 'project', 'entity_id' => 'project-rationmart', 'succeeded' => true, 'metadata' => ['project_name' => 'RationMart Inventory & Billing'], 'ip_address' => '127.0.0.1', 'request_id' => null],
    ],
];
