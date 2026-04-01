ALTER TABLE `users`
MODIFY COLUMN `role` enum('admin','sales','manager','staff') NOT NULL DEFAULT 'staff';
