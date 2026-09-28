<?php

namespace Database\Seeders;

/** Organization identity is public; all people, credentials, projects, and activity are fictional demo data. */
class JashabhsoftSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return [
            'organization' => [
                'id' => 'org-jashabhsoft',
                'name' => 'Jashabhsoft (Pvt.) Ltd',
                'login_email' => 'info@jashabhsoft.com',
                'password' => 'BlockBug@123',
                'status' => 'active',
                'created_at' => '2026-09-05 11:23:00',
            ],
            'users' => [
                ['id' => 'user-jsh-admin', 'name' => 'Usman Tariq', 'email' => 'usman.tariq90@jashabhsoft.com', 'password' => 'BlockBug@123', 'role' => 'admin', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-05 11:31:00'],
                ['id' => 'user-jsh-manager', 'name' => 'Hassan Raza', 'email' => 'hassan.raza71@jashabhsoft.com', 'password' => 'BlockBug@123', 'role' => 'manager', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-05 11:38:00'],
                ['id' => 'user-jsh-dev', 'name' => 'Ali Hamza', 'email' => 'alihamza.dev29@jashabhsoft.com', 'password' => 'BlockBug@123', 'role' => 'developer', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-05 11:44:00'],
                ['id' => 'user-jsh-tester', 'name' => 'Areeba Malik', 'email' => 'areeba.malik.qa@jashabhsoft.com', 'password' => 'BlockBug@123', 'role' => 'tester', 'status' => 'active', 'avatar' => null, 'created_at' => '2026-09-05 11:51:00'],
            ],
            'projects' => [
                ['id' => 'project-jsh-cms', 'name' => 'Business Site CMS', 'description' => 'A small business website with editable service pages, inquiries and a simple admin area.', 'project_key' => 'JSH', 'status' => 'active', 'team_size' => 4, 'created_at' => '2026-09-07 10:25:00'],
            ],
            'sprints' => [
                ['id' => 'sprint-jsh-cms-01', 'project_id' => 'project-jsh-cms', 'name' => 'CMS Delivery', 'goal' => 'Deliver the editable business site and stabilize its inquiry flow.', 'status' => 'active', 'start_date' => '2026-09-07', 'end_date' => '2026-10-20', 'created_by' => 'hassan.raza71@jashabhsoft.com', 'completed_at' => null, 'created_at' => '2026-09-07 10:25:00'],
            ],
            'bugs' => [
                ['id' => 'bug-jsh-001', 'title' => 'Inquiry form submits twice on slow connection', 'description' => 'On a slow connection, clicking the submit button again can create a duplicate inquiry.', 'status' => 'in-progress', 'priority' => 'medium', 'severity' => 'major', 'project_id' => 'project-jsh-cms', 'sprint_id' => 'sprint-jsh-cms-01', 'reported_by' => 'areeba.malik.qa@jashabhsoft.com', 'assigned_to' => 'alihamza.dev29@jashabhsoft.com', 'verification_tester_email' => 'areeba.malik.qa@jashabhsoft.com', 'environment' => 'Chrome / Windows 11', 'verified_at' => null, 'created_at' => '2026-09-11 11:43:00'],
                ['id' => 'bug-jsh-002', 'title' => 'Service page breadcrumb wraps awkwardly', 'description' => 'Long service names make the breadcrumb wrap into the page heading on mobile.', 'status' => 'open', 'priority' => 'low', 'severity' => 'minor', 'project_id' => 'project-jsh-cms', 'sprint_id' => 'sprint-jsh-cms-01', 'reported_by' => 'areeba.malik.qa@jashabhsoft.com', 'assigned_to' => 'alihamza.dev29@jashabhsoft.com', 'verification_tester_email' => 'areeba.malik.qa@jashabhsoft.com', 'environment' => 'Safari / iPhone', 'verified_at' => null, 'created_at' => '2026-09-16 15:11:00'],
            ],
            'activities' => [
                ['id' => 'act-jsh-001', 'bug_id' => null, 'type' => 'created', 'user_id' => 'user-jsh-admin', 'user_name' => 'Usman Tariq', 'message' => 'Created the Business Site CMS project.', 'created_at' => '2026-09-07 10:25:00'],
                ['id' => 'act-jsh-002', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-jsh-admin', 'user_name' => 'Usman Tariq', 'message' => 'Assigned Hassan Raza as project manager.', 'created_at' => '2026-09-07 10:31:00'],
                ['id' => 'act-jsh-003', 'bug_id' => null, 'type' => 'assigned', 'user_id' => 'user-jsh-manager', 'user_name' => 'Hassan Raza', 'message' => 'Added the developer and tester to the project.', 'created_at' => '2026-09-07 10:37:00'],
                ['id' => 'act-jsh-004', 'bug_id' => 'bug-jsh-001', 'type' => 'created', 'user_id' => 'user-jsh-tester', 'user_name' => 'Areeba Malik', 'message' => 'Reported duplicate inquiry submission on slow connections.', 'created_at' => '2026-09-11 11:43:00'],
                ['id' => 'act-jsh-005', 'bug_id' => 'bug-jsh-001', 'type' => 'assigned', 'user_id' => 'user-jsh-manager', 'user_name' => 'Hassan Raza', 'message' => 'Assigned the bug to Ali Hamza.', 'created_at' => '2026-09-11 12:01:00'],
                ['id' => 'act-jsh-006', 'bug_id' => 'bug-jsh-001', 'type' => 'status_changed', 'user_id' => 'user-jsh-dev', 'user_name' => 'Ali Hamza', 'message' => 'Changed status from open to in-progress.', 'created_at' => '2026-09-12 13:08:00'],
                ['id' => 'act-jsh-007', 'bug_id' => 'bug-jsh-002', 'type' => 'created', 'user_id' => 'user-jsh-tester', 'user_name' => 'Areeba Malik', 'message' => 'Reported the mobile breadcrumb layout issue.', 'created_at' => '2026-09-16 15:11:00'],
            ],
            'comments' => [
                ['id' => 'comment-jsh-001', 'bug_id' => 'bug-jsh-001', 'parent_comment_id' => null, 'user_email' => 'alihamza.dev29@jashabhsoft.com', 'user_name' => 'Ali Hamza', 'comment' => 'Added a submit lock after the first request. Testing the disabled state now.', 'created_at' => '2026-09-12 13:08:00'],
            ],
            'notifications' => [],
            'audit_logs' => [
                ['actor_type' => 'user', 'actor_id' => 'user-jsh-admin', 'actor_role' => 'admin', 'action' => 'PROJECT_CREATED', 'entity_type' => 'project', 'entity_id' => 'project-jsh-cms', 'succeeded' => true, 'metadata' => ['project_name' => 'Business Site CMS'], 'ip_address' => '127.0.0.1', 'request_id' => null, 'created_at' => '2026-09-07 10:25:00'],
            ],
        ];
    }
}
