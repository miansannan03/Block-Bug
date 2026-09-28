<?php

namespace Database\Seeders;

/** Organization identity is public; all people, credentials, projects, and activity are fictional demo data. */
class OrbitorsSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return [
            'organization' => [
                'id' => 'org-orbitors',
                'name' => 'Orbitors IT Solutions (Private) Limited',
                'login_email' => 'contact@orbitors.pk',
                'password' => 'BlockBug@123',
                'status' => 'active',
                'created_at' => '2026-09-01 10:06:00',
            ],
            'users' => [
                ['id' => 'user-orb-admin', 'name' => 'Hamza Afridi', 'email' => 'hamza.afridi76@orbitors.com', 'password' => 'BlockBug@123', 'role' => 'admin', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-01 10:14:00'],
                ['id' => 'user-orb-manager', 'name' => 'Raza Khan', 'email' => 'raza.khan.dev11@orbitors.com', 'password' => 'BlockBug@123', 'role' => 'manager', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-01 10:20:00'],
                ['id' => 'user-orb-dev-01', 'name' => 'Daniyal Shah', 'email' => 'daniyal.shah92@orbitors.com', 'password' => 'BlockBug@123', 'role' => 'developer', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-01 10:28:00'],
                ['id' => 'user-orb-dev-02', 'name' => 'Muneeb Ali', 'email' => 'muneebali.web34@orbitors.com', 'password' => 'BlockBug@123', 'role' => 'developer', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-01 10:34:00'],
                ['id' => 'user-orb-tester', 'name' => 'Sana Gul', 'email' => 'sana.gul.qa@orbitors.com', 'password' => 'BlockBug@123', 'role' => 'tester', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-01 10:41:00'],
            ],
            'projects' => [
                ['id' => 'project-orb-booking', 'name' => 'Booking Dashboard', 'description' => 'A lightweight booking and customer dashboard for a small service business.', 'project_key' => 'ORB', 'status' => 'active', 'team_size' => 5, 'created_at' => '2026-09-03 11:02:00'],
            ],
            'sprints' => [
                ['id' => 'sprint-orb-booking-01', 'project_id' => 'project-orb-booking', 'name' => 'Booking Dashboard Delivery', 'goal' => 'Deliver and stabilize the booking and customer dashboard.', 'status' => 'active', 'start_date' => '2026-09-03', 'end_date' => '2026-10-24', 'created_by' => 'raza.khan.dev11@orbitors.com', 'completed_at' => null, 'created_at' => '2026-09-03 11:02:00'],
            ],
            'bugs' => [
                ['id' => 'bug-orb-001', 'title' => 'Booking status badge uses old value after edit', 'description' => 'After changing a booking status, the summary badge keeps the old value until the page is refreshed.', 'status' => 'in-progress', 'priority' => 'medium', 'severity' => 'minor', 'project_id' => 'project-orb-booking', 'sprint_id' => 'sprint-orb-booking-01', 'reported_by' => 'sana.gul.qa@orbitors.com', 'assigned_to' => 'daniyal.shah92@orbitors.com', 'verification_tester_email' => 'sana.gul.qa@orbitors.com', 'environment' => 'Chrome / Windows 11', 'verified_at' => null, 'created_at' => '2026-09-07 10:52:00'],
                ['id' => 'bug-orb-002', 'title' => 'Mobile filter drawer does not close after apply', 'description' => 'The booking filter drawer stays open after Apply is tapped on a small mobile screen.', 'status' => 'open', 'priority' => 'low', 'severity' => 'minor', 'project_id' => 'project-orb-booking', 'sprint_id' => 'sprint-orb-booking-01', 'reported_by' => 'sana.gul.qa@orbitors.com', 'assigned_to' => 'muneebali.web34@orbitors.com', 'verification_tester_email' => 'sana.gul.qa@orbitors.com', 'environment' => 'Chrome / Android', 'verified_at' => null, 'created_at' => '2026-09-12 14:19:00'],
            ],
            'activities' => [
                ['id' => 'act-orb-001', 'bug_id' => null, 'type' => 'created', 'user_id' => 'user-orb-admin', 'user_name' => 'Hamza Afridi', 'message' => 'Created the Booking Dashboard project.', 'created_at' => '2026-09-03 11:02:00'],
                ['id' => 'act-orb-002', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-orb-admin', 'user_name' => 'Hamza Afridi', 'message' => 'Assigned Raza Khan as project manager.', 'created_at' => '2026-09-03 11:09:00'],
                ['id' => 'act-orb-003', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-orb-manager', 'user_name' => 'Raza Khan', 'message' => 'Added the development and QA members.', 'created_at' => '2026-09-03 11:16:00'],
                ['id' => 'act-orb-004', 'bug_id' => 'bug-orb-001', 'type' => 'created', 'user_id' => 'user-orb-tester', 'user_name' => 'Sana Gul', 'message' => 'Reported the stale booking status badge.', 'created_at' => '2026-09-07 10:52:00'],
                ['id' => 'act-orb-005', 'bug_id' => 'bug-orb-001', 'type' => 'assigned', 'user_id' => 'user-orb-manager', 'user_name' => 'Raza Khan', 'message' => 'Assigned the bug to Daniyal Shah.', 'created_at' => '2026-09-07 11:08:00'],
                ['id' => 'act-orb-006', 'bug_id' => 'bug-orb-001', 'type' => 'status_changed', 'user_id' => 'user-orb-dev-01', 'user_name' => 'Daniyal Shah', 'message' => 'Changed status from open to in-progress.', 'created_at' => '2026-09-08 13:20:00'],
                ['id' => 'act-orb-007', 'bug_id' => 'bug-orb-002', 'type' => 'created', 'user_id' => 'user-orb-tester', 'user_name' => 'Sana Gul', 'message' => 'Reported the mobile filter drawer issue.', 'created_at' => '2026-09-12 14:19:00'],
            ],
            'comments' => [],
            'notifications' => [],
            'audit_logs' => [
                ['actor_type' => 'user', 'actor_id' => 'user-orb-admin', 'actor_role' => 'admin', 'action' => 'PROJECT_CREATED', 'entity_type' => 'project', 'entity_id' => 'project-orb-booking', 'succeeded' => true, 'metadata' => ['project_name' => 'Booking Dashboard'], 'ip_address' => '127.0.0.1', 'request_id' => null, 'created_at' => '2026-09-03 11:02:00'],
            ],
        ];
    }
}
