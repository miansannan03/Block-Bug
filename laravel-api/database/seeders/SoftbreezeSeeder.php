<?php

namespace Database\Seeders;

/** Organization identity is public; all people, credentials, projects, and activity are fictional demo data. */
class SoftbreezeSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return [
            'organization' => [
                'id' => 'org-softbreeze',
                'name' => 'Softbreeze',
                'login_email' => 'info@softbreeze.org',
                'password' => 'BlockBug@123',
                'status' => 'active',
                'created_at' => '2026-08-28 14:42:00',
            ],
            'users' => [
                ['id' => 'user-soft-admin', 'name' => 'Farhan Ali', 'email' => 'farhanali.pk88@softbreeze.com', 'password' => 'BlockBug@123', 'role' => 'admin', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 14:51:00'],
                ['id' => 'user-soft-manager', 'name' => 'Waleed Khan', 'email' => 'waleed.khan47@softbreeze.com', 'password' => 'BlockBug@123', 'role' => 'manager', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 14:58:00'],
                ['id' => 'user-soft-dev-01', 'name' => 'Shayan Ahmad', 'email' => 'shayan.ahmad91@softbreeze.com', 'password' => 'BlockBug@123', 'role' => 'developer', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 15:04:00'],
                ['id' => 'user-soft-dev-02', 'name' => 'Adeel Shah', 'email' => 'adeel.shah.dev@softbreeze.com', 'password' => 'BlockBug@123', 'role' => 'developer', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 15:11:00'],
                ['id' => 'user-soft-tester', 'name' => 'Iqra Noor', 'email' => 'iqra.noor.qa24@softbreeze.com', 'password' => 'BlockBug@123', 'role' => 'tester', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-08-28 15:17:00'],
            ],
            'projects' => [
                ['id' => 'project-soft-retail', 'name' => 'Retail Site Refresh', 'description' => 'A small storefront refresh covering catalog pages, contact forms and responsive layout cleanup.', 'project_key' => 'SBR', 'status' => 'active', 'team_size' => 5, 'created_at' => '2026-08-31 09:34:00'],
            ],
            'sprints' => [
                ['id' => 'sprint-soft-retail-01', 'project_id' => 'project-soft-retail', 'name' => 'Retail Refresh Delivery', 'goal' => 'Complete the storefront refresh and stabilize responsive behavior.', 'status' => 'active', 'start_date' => '2026-08-31', 'end_date' => '2026-10-10', 'created_by' => 'waleed.khan47@softbreeze.com', 'completed_at' => null, 'created_at' => '2026-08-31 09:34:00'],
            ],
            'bugs' => [
                ['id' => 'bug-soft-001', 'title' => 'Product card image shifts on tablet width', 'description' => 'Catalog card images briefly shift when the viewport crosses the tablet breakpoint.', 'status' => 'closed', 'priority' => 'low', 'severity' => 'minor', 'project_id' => 'project-soft-retail', 'sprint_id' => 'sprint-soft-retail-01', 'reported_by' => 'iqra.noor.qa24@softbreeze.com', 'assigned_to' => 'adeel.shah.dev@softbreeze.com', 'verification_tester_email' => 'iqra.noor.qa24@softbreeze.com', 'environment' => 'Chrome / Android tablet', 'verified_at' => '2026-09-06 10:14:00', 'created_at' => '2026-09-04 10:22:00'],
                ['id' => 'bug-soft-002', 'title' => 'Contact form keeps old validation message', 'description' => 'The email validation message remains visible after the user corrects the address.', 'status' => 'open', 'priority' => 'medium', 'severity' => 'minor', 'project_id' => 'project-soft-retail', 'sprint_id' => 'sprint-soft-retail-01', 'reported_by' => 'iqra.noor.qa24@softbreeze.com', 'assigned_to' => 'shayan.ahmad91@softbreeze.com', 'verification_tester_email' => 'iqra.noor.qa24@softbreeze.com', 'environment' => 'Firefox / Windows 11', 'verified_at' => null, 'created_at' => '2026-09-09 12:38:00'],
            ],
            'activities' => [
                ['id' => 'act-soft-001', 'bug_id' => null, 'type' => 'created', 'user_id' => 'user-soft-admin', 'user_name' => 'Farhan Ali', 'message' => 'Created the Retail Site Refresh project.', 'created_at' => '2026-08-31 09:34:00'],
                ['id' => 'act-soft-002', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-soft-admin', 'user_name' => 'Farhan Ali', 'message' => 'Assigned Waleed Khan as project manager.', 'created_at' => '2026-08-31 09:41:00'],
                ['id' => 'act-soft-003', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-soft-manager', 'user_name' => 'Waleed Khan', 'message' => 'Added the developers and tester to the project.', 'created_at' => '2026-08-31 09:48:00'],
                ['id' => 'act-soft-004', 'bug_id' => 'bug-soft-001', 'type' => 'created', 'user_id' => 'user-soft-tester', 'user_name' => 'Iqra Noor', 'message' => 'Reported product card image shifting at tablet width.', 'created_at' => '2026-09-04 10:22:00'],
                ['id' => 'act-soft-005', 'bug_id' => 'bug-soft-001', 'type' => 'assigned', 'user_id' => 'user-soft-manager', 'user_name' => 'Waleed Khan', 'message' => 'Assigned the bug to Adeel Shah.', 'created_at' => '2026-09-04 10:35:00'],
                ['id' => 'act-soft-006', 'bug_id' => 'bug-soft-001', 'type' => 'status_changed', 'user_id' => 'user-soft-dev-02', 'user_name' => 'Adeel Shah', 'message' => 'Submitted the fix for tester verification.', 'created_at' => '2026-09-05 11:46:00'],
                ['id' => 'act-soft-007', 'bug_id' => 'bug-soft-001', 'type' => 'verified', 'user_id' => 'user-soft-tester', 'user_name' => 'Iqra Noor', 'message' => 'Verified the fix and closed the bug.', 'created_at' => '2026-09-06 10:14:00'],
                ['id' => 'act-soft-008', 'bug_id' => 'bug-soft-002', 'type' => 'created', 'user_id' => 'user-soft-tester', 'user_name' => 'Iqra Noor', 'message' => 'Reported the stale contact-form validation message.', 'created_at' => '2026-09-09 12:38:00'],
            ],
            'comments' => [
                ['id' => 'comment-soft-001', 'bug_id' => 'bug-soft-001', 'parent_comment_id' => null, 'user_email' => 'adeel.shah.dev@softbreeze.com', 'user_name' => 'Adeel Shah', 'comment' => 'Adjusted the image wrapper height at the tablet breakpoint. Ready for a quick retest.', 'created_at' => '2026-09-05 11:46:00'],
            ],
            'notifications' => [],
            'audit_logs' => [
                ['actor_type' => 'user', 'actor_id' => 'user-soft-admin', 'actor_role' => 'admin', 'action' => 'PROJECT_CREATED', 'entity_type' => 'project', 'entity_id' => 'project-soft-retail', 'succeeded' => true, 'metadata' => ['project_name' => 'Retail Site Refresh'], 'ip_address' => '127.0.0.1', 'request_id' => null, 'created_at' => '2026-08-31 09:34:00'],
            ],
        ];
    }
}
