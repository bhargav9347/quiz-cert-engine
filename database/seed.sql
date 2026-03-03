USE quiz_cert_engine;

-- Quiz 1: JavaScript Fundamentals
INSERT INTO quizzes (title, description, time_limit, passing_score, created_by, is_published) 
VALUES ('JavaScript Fundamentals', 'Test your core JavaScript knowledge, from variables to closures.', 10, 70, 1, TRUE);
SET @quiz1_id = LAST_INSERT_ID();

-- Q1 for Quiz 1
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz1_id, 'What is the correct way to declare a constant in JavaScript?');
SET @q1_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q1_id, 'var', FALSE),
(@q1_id, 'let', FALSE),
(@q1_id, 'const', TRUE),
(@q1_id, 'constant', FALSE);

-- Q2 for Quiz 1
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz1_id, 'Which method is used to add an element to the end of an array?');
SET @q2_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q2_id, 'pop()', FALSE),
(@q2_id, 'push()', TRUE),
(@q2_id, 'shift()', FALSE),
(@q2_id, 'unshift()', FALSE);

-- Q3 for Quiz 1
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz1_id, 'What will `typeof []` return?');
SET @q3_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q3_id, '"array"', FALSE),
(@q3_id, '"list"', FALSE),
(@q3_id, '"object"', TRUE),
(@q3_id, '"undefined"', FALSE);


-- Quiz 2: Node.js Backend Basics
INSERT INTO quizzes (title, description, time_limit, passing_score, created_by, is_published) 
VALUES ('Node.js Backend Basics', 'Master the essentials of Node.js modules, NPM, and async operations.', 15, 60, 1, TRUE);
SET @quiz2_id = LAST_INSERT_ID();

-- Q1 for Quiz 2
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz2_id, 'Which module is used for file system operations in Node.js?');
SET @q4_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q4_id, 'path', FALSE),
(@q4_id, 'http', FALSE),
(@q4_id, 'fs', TRUE),
(@q4_id, 'os', FALSE);

-- Q2 for Quiz 2
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz2_id, 'How do you initialize a new NPM project?');
SET @q5_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q5_id, 'npm start', FALSE),
(@q5_id, 'npm init', TRUE),
(@q5_id, 'npm create', FALSE),
(@q5_id, 'npm install', FALSE);


-- Quiz 3: Web Security Essentials
INSERT INTO quizzes (title, description, time_limit, passing_score, created_by, is_published) 
VALUES ('Web Security Essentials', 'Learn the basics of preventing common web vulnerabilities like XSS and CSRF.', 20, 80, 1, TRUE);
SET @quiz3_id = LAST_INSERT_ID();

-- Q1 for Quiz 3
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz3_id, 'What does XSS stand for?');
SET @q6_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q6_id, 'XML Site Scripting', FALSE),
(@q6_id, 'X-site Static Sharing', FALSE),
(@q6_id, 'Cross-Site Scripting', TRUE),
(@q6_id, 'Extended Site Security', FALSE);

-- Q2 for Quiz 3
INSERT INTO questions (quiz_id, question_text) VALUES (@quiz3_id, 'Which HTTP header is used to prevent the browser from interpreting files as a different MIME type?');
SET @q7_id = LAST_INSERT_ID();
INSERT INTO options (question_id, option_text, is_correct) VALUES 
(@q7_id, 'X-Frame-Options', FALSE),
(@q7_id, 'X-Content-Type-Options', TRUE),
(@q7_id, 'Content-Security-Policy', FALSE),
(@q7_id, 'Strict-Transport-Security', FALSE);
