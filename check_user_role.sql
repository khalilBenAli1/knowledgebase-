SELECT u.email, u.name, r.name as role_name 
FROM users u 
JOIN roles r ON u."roleId" = r.id 
WHERE u.email = 'admin@biat.com';
