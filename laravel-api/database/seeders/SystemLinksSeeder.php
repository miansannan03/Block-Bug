<?php

namespace Database\Seeders;

/** Organization identity is public; all people, credentials, projects, and activity are fictional demo data. */
class SystemLinksSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return [
            'organization' => [
                'id' => 'org-system-links',
                'name' => 'System Links',
                'login_email' => 'info@systemlinkss.com',
                'password' => 'BlockBug@123',
                'status' => 'active',
                'created_at' => '2026-08-28 09:18:00',
            ],
            'users' => [
                ['id' => 'user-sys-admin', 'name' => 'Haris Khan', 'email' => 'haris.khan84@systemlinks.com', 'password' => 'BlockBug@123', 'role' => 'admin', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 09:26:00'],
                ['id' => 'user-sys-manager', 'name' => 'Saad Ullah', 'email' => 'saadullah.dev27@systemlinks.com', 'password' => 'BlockBug@123', 'role' => 'manager', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 09:33:00'],
                ['id' => 'user-sys-dev', 'name' => 'Ammar Shah', 'email' => 'ammar.shah93@systemlinks.com', 'password' => 'BlockBug@123', 'role' => 'developer', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 09:41:00'],
                ['id' => 'user-sys-tester', 'name' => 'Maira Khan', 'email' => 'maira.khan.qa@systemlinks.com', 'password' => 'BlockBug@123', 'role' => 'tester', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 09:47:00'],
            ],
            'projects' => [
                ['id' => 'project-sys-support', 'name' => 'Client Support Portal', 'description' => 'Small internal support portal for handling client requests and follow-ups.', 'project_key' => 'SYS', 'status' => 'active', 'team_size' => 4, 'created_at' => '2026-08-30 10:12:00'],
            ],
            'sprints' => [
                ['id' => 'sprint-sys-support-01', 'project_id' => 'project-sys-support', 'name' => 'Support Portal Delivery', 'goal' => 'Deliver the internal client support and follow-up workflow.', 'status' => 'active', 'start_date' => '2026-08-30', 'end_date' => '2026-10-18', 'created_by' => 'saadullah.dev27@systemlinks.com', 'completed_at' => null, 'created_at' => '2026-08-30 10:12:00'],
            ],
            'bugs' => [
                ['id' => 'bug-sys-001', 'title' => 'Ticket list refresh loses selected filter', 'description' => 'The selected request-status filter resets after refreshing the ticket list.', 'status' => 'in-progress', 'priority' => 'medium', 'severity' => 'minor', 'project_id' => 'project-sys-support', 'sprint_id' => 'sprint-sys-support-01', 'reported_by' => 'maira.khan.qa@systemlinks.com', 'assigned_to' => 'ammar.shah93@systemlinks.com', 'verification_tester_email' => 'maira.khan.qa@systemlinks.com', 'environment' => 'Chrome / Windows 11', 'verified_at' => null, 'created_at' => '2026-09-03 11:18:00'],
                ['id' => 'bug-sys-002', 'title' => 'Long client note overflows activity card', 'description' => 'Long notes extend outside the activity card on smaller laptop widths.', 'status' => 'open', 'priority' => 'low', 'severity' => 'minor', 'project_id' => 'project-sys-support', 'sprint_id' => 'sprint-sys-support-01', 'reported_by' => 'maira.khan.qa@systemlinks.com', 'assigned_to' => 'ammar.shah93@systemlinks.com', 'verification_tester_email' => 'maira.khan.qa@systemlinks.com', 'environment' => 'Edge / Windows 11', 'verified_at' => null, 'created_at' => '2026-09-08 15:06:00'],
            ],
            'activities' => [
                ['id' => 'act-sys-001', 'bug_id' => null, 'type' => 'created', 'user_id' => 'user-sys-admin', 'user_name' => 'Haris Khan', 'message' => 'Created the Client Support Portal project.', 'created_at' => '2026-08-30 10:12:00'],
                ['id' => 'act-sys-002', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-sys-admin', 'user_name' => 'Haris Khan', 'message' => 'Assigned Saad Ullah as project manager.', 'created_at' => '2026-08-30 10:18:00'],
                ['id' => 'act-sys-003', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-sys-manager', 'user_name' => 'Saad Ullah', 'message' => 'Added the development and QA members.', 'created_at' => '2026-08-30 10:25:00'],
                ['id' => 'act-sys-004', 'bug_id' => 'bug-sys-001', 'type' => 'created', 'user_id' => 'user-sys-tester', 'user_name' => 'Maira Khan', 'message' => 'Reported the ticket-filter reset issue.', 'created_at' => '2026-09-03 11:18:00'],
                ['id' => 'act-sys-005', 'bug_id' => 'bug-sys-001', 'type' => 'assigned', 'user_id' => 'user-sys-manager', 'user_name' => 'Saad Ullah', 'message' => 'Assigned the bug to Ammar Shah.', 'created_at' => '2026-09-03 12:02:00'],
                ['id' => 'act-sys-006', 'bug_id' => 'bug-sys-001', 'type' => 'status_changed', 'user_id' => 'user-sys-dev', 'user_name' => 'Ammar Shah', 'message' => 'Changed status from open to in-progress.', 'created_at' => '2026-09-04 10:40:00'],
                ['id' => 'act-sys-007', 'bug_id' => 'bug-sys-002', 'type' => 'created', 'user_id' => 'user-sys-tester', 'user_name' => 'Maira Khan', 'message' => 'Reported the overflowing client note.', 'created_at' => '2026-09-08 15:06:00'],
            ],
            'comments' => [],
            'notifications' => [],
            'audit_logs' => [
                ['actor_type' => 'user', 'actor_id' => 'user-sys-admin', 'actor_role' => 'admin', 'action' => 'PROJECT_CREATED', 'entity_type' => 'project', 'entity_id' => 'project-sys-support', 'succeeded' => true, 'metadata' => ['project_name' => 'Client Support Portal'], 'ip_address' => '127.0.0.1', 'request_id' => null, 'created_at' => '2026-08-30 10:12:00'],
            ],
        ];
    }
}
