const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Realistic employee data by department
const departmentTeams = {
  'Engineering': [
    {
      firstName: 'Sarah',
      lastName: 'Chen',
      designation: 'Senior Software Engineer',
      experience: 8,
      education: 'MS Computer Science',
      university: 'MIT',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
    },
    {
      firstName: 'Michael',
      lastName: 'Rodriguez',
      designation: 'Software Engineer',
      experience: 5,
      education: 'BS Computer Science',
      university: 'Stanford University',
      skills: ['Java', 'Spring Boot', 'Microservices', 'PostgreSQL', 'Kubernetes'],
    },
    {
      firstName: 'Emily',
      lastName: 'Johnson',
      designation: 'Frontend Developer',
      experience: 4,
      education: 'BS Information Technology',
      university: 'UC Berkeley',
      skills: ['React', 'TypeScript', 'CSS', 'Tailwind', 'Next.js', 'UI/UX'],
    },
    {
      firstName: 'David',
      lastName: 'Kim',
      designation: 'Backend Developer',
      experience: 6,
      education: 'MS Software Engineering',
      university: 'Carnegie Mellon',
      skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'GraphQL', 'API Design'],
    },
    {
      firstName: 'Alex',
      lastName: 'Thompson',
      designation: 'Junior Developer',
      experience: 2,
      education: 'BS Computer Science',
      university: 'Georgia Tech',
      skills: ['JavaScript', 'HTML', 'CSS', 'Git', 'REST APIs', 'Agile'],
    },
  ],

  'DevOps': [
    {
      firstName: 'James',
      lastName: 'Wilson',
      designation: 'DevOps Lead',
      experience: 10,
      education: 'MS Computer Engineering',
      university: 'University of Texas',
      skills: ['Kubernetes', 'Docker', 'CI/CD', 'Jenkins', 'Terraform', 'AWS'],
    },
    {
      firstName: 'Lisa',
      lastName: 'Anderson',
      designation: 'DevOps Engineer',
      experience: 6,
      education: 'BS Computer Science',
      university: 'University of Michigan',
      skills: ['Azure', 'Ansible', 'Linux', 'Shell Scripting', 'Monitoring', 'Prometheus'],
    },
    {
      firstName: 'Robert',
      lastName: 'Martinez',
      designation: 'Site Reliability Engineer',
      experience: 7,
      education: 'MS Systems Engineering',
      university: 'Cornell University',
      skills: ['SRE', 'Python', 'Go', 'Incident Management', 'Load Balancing', 'Security'],
    },
    {
      firstName: 'Jessica',
      lastName: 'Taylor',
      designation: 'Cloud Engineer',
      experience: 5,
      education: 'BS Information Systems',
      university: 'NYU',
      skills: ['AWS', 'GCP', 'Cloud Architecture', 'Serverless', 'Lambda', 'S3'],
    },
    {
      firstName: 'Daniel',
      lastName: 'Brown',
      designation: 'Infrastructure Engineer',
      experience: 4,
      education: 'BS Computer Engineering',
      university: 'Purdue University',
      skills: ['Networking', 'Load Balancers', 'CDN', 'DNS', 'Security', 'Automation'],
    },
  ],

  'Product': [
    {
      firstName: 'Amanda',
      lastName: 'Foster',
      designation: 'Senior Product Manager',
      experience: 9,
      education: 'MBA',
      university: 'Harvard Business School',
      skills: ['Product Strategy', 'Roadmap', 'User Research', 'Analytics', 'Agile', 'Jira'],
    },
    {
      firstName: 'Chris',
      lastName: 'Parker',
      designation: 'Product Manager',
      experience: 5,
      education: 'MS Product Management',
      university: 'Northwestern University',
      skills: ['Product Design', 'User Stories', 'Wireframing', 'A/B Testing', 'SQL', 'Figma'],
    },
    {
      firstName: 'Rachel',
      lastName: 'Lewis',
      designation: 'Product Owner',
      experience: 4,
      education: 'BS Business Administration',
      university: 'University of Pennsylvania',
      skills: ['Backlog Management', 'Sprint Planning', 'Stakeholder Management', 'Scrum'],
    },
    {
      firstName: 'Kevin',
      lastName: 'Hall',
      designation: 'UX Designer',
      experience: 6,
      education: 'MFA Design',
      university: 'RISD',
      skills: ['UI/UX', 'Figma', 'Adobe XD', 'Prototyping', 'User Research', 'Design Systems'],
    },
    {
      firstName: 'Olivia',
      lastName: 'Wright',
      designation: 'Product Analyst',
      experience: 3,
      education: 'BS Data Science',
      university: 'UC San Diego',
      skills: ['Analytics', 'SQL', 'Python', 'Tableau', 'User Behavior', 'Metrics'],
    },
  ],

  'QA & Testing': [
    {
      firstName: 'Thomas',
      lastName: 'Green',
      designation: 'QA Lead',
      experience: 8,
      education: 'MS Software Testing',
      university: 'University of Maryland',
      skills: ['Test Strategy', 'Automation', 'Selenium', 'Performance Testing', 'CI/CD'],
    },
    {
      firstName: 'Jennifer',
      lastName: 'Adams',
      designation: 'Senior QA Engineer',
      experience: 6,
      education: 'BS Computer Science',
      university: 'Virginia Tech',
      skills: ['Manual Testing', 'Automation', 'JUnit', 'TestNG', 'API Testing', 'Postman'],
    },
    {
      firstName: 'Mark',
      lastName: 'Nelson',
      designation: 'Automation Engineer',
      experience: 5,
      education: 'BS Information Technology',
      university: 'Arizona State',
      skills: ['Selenium', 'Cypress', 'JavaScript', 'Python', 'Test Frameworks', 'Jenkins'],
    },
    {
      firstName: 'Laura',
      lastName: 'Carter',
      designation: 'QA Engineer',
      experience: 4,
      education: 'BS Software Engineering',
      university: 'Florida State',
      skills: ['Test Cases', 'Bug Tracking', 'Jira', 'Regression Testing', 'Mobile Testing'],
    },
    {
      firstName: 'Steven',
      lastName: 'Mitchell',
      designation: 'Junior QA Engineer',
      experience: 2,
      education: 'BS Computer Science',
      university: 'Ohio State',
      skills: ['Manual Testing', 'Test Documentation', 'Bug Reporting', 'Agile', 'SQL'],
    },
  ],

  'Marketing': [
    {
      firstName: 'Nicole',
      lastName: 'Roberts',
      designation: 'Marketing Director',
      experience: 10,
      education: 'MBA Marketing',
      university: 'Columbia Business School',
      skills: ['Marketing Strategy', 'Brand Management', 'Campaign Management', 'Analytics'],
    },
    {
      firstName: 'Brian',
      lastName: 'Turner',
      designation: 'Digital Marketing Manager',
      experience: 6,
      education: 'BS Marketing',
      university: 'University of Texas',
      skills: ['SEO', 'SEM', 'Google Ads', 'Social Media', 'Email Marketing', 'Analytics'],
    },
    {
      firstName: 'Michelle',
      lastName: 'Phillips',
      designation: 'Content Marketing Specialist',
      experience: 4,
      education: 'BA English',
      university: 'Boston University',
      skills: ['Content Strategy', 'Copywriting', 'SEO', 'Blog Management', 'WordPress'],
    },
    {
      firstName: 'Andrew',
      lastName: 'Campbell',
      designation: 'Social Media Manager',
      experience: 3,
      education: 'BS Communications',
      university: 'Syracuse University',
      skills: ['Social Media', 'Community Management', 'Content Creation', 'Analytics'],
    },
    {
      firstName: 'Samantha',
      lastName: 'Evans',
      designation: 'Marketing Analyst',
      experience: 3,
      education: 'BS Business Analytics',
      university: 'Indiana University',
      skills: ['Google Analytics', 'Data Analysis', 'Reporting', 'Excel', 'SQL', 'Tableau'],
    },
  ],

  'Sales': [
    {
      firstName: 'William',
      lastName: 'Collins',
      designation: 'Sales Director',
      experience: 12,
      education: 'MBA',
      university: 'Wharton School',
      skills: ['Sales Strategy', 'Team Leadership', 'Revenue Growth', 'CRM', 'Salesforce'],
    },
    {
      firstName: 'Victoria',
      lastName: 'Stewart',
      designation: 'Senior Account Executive',
      experience: 7,
      education: 'BS Business',
      university: 'USC',
      skills: ['B2B Sales', 'Negotiation', 'Account Management', 'Pipeline Management'],
    },
    {
      firstName: 'Patrick',
      lastName: 'Morris',
      designation: 'Account Executive',
      experience: 4,
      education: 'BS Marketing',
      university: 'Penn State',
      skills: ['Sales', 'Lead Generation', 'Cold Calling', 'Presentation', 'Closing'],
    },
    {
      firstName: 'Megan',
      lastName: 'Rogers',
      designation: 'Sales Development Rep',
      experience: 2,
      education: 'BS Business Administration',
      university: 'University of Florida',
      skills: ['Prospecting', 'Outreach', 'Qualification', 'CRM', 'Email Campaigns'],
    },
    {
      firstName: 'Joshua',
      lastName: 'Reed',
      designation: 'Inside Sales Representative',
      experience: 3,
      education: 'BS Economics',
      university: 'UCLA',
      skills: ['Sales Calls', 'Demo Presentations', 'Follow-ups', 'Salesforce', 'Reporting'],
    },
  ],

  'Finance': [
    {
      firstName: 'Catherine',
      lastName: 'Cook',
      designation: 'Finance Director',
      experience: 11,
      education: 'MBA Finance',
      university: 'University of Chicago',
      skills: ['Financial Planning', 'Budgeting', 'Forecasting', 'FP&A', 'Risk Management'],
    },
    {
      firstName: 'Richard',
      lastName: 'Morgan',
      designation: 'Senior Financial Analyst',
      experience: 7,
      education: 'MS Finance',
      university: 'NYU Stern',
      skills: ['Financial Modeling', 'Analysis', 'Excel', 'Reporting', 'Valuation'],
    },
    {
      firstName: 'Angela',
      lastName: 'Bell',
      designation: 'Financial Analyst',
      experience: 4,
      education: 'BS Accounting',
      university: 'University of Illinois',
      skills: ['Financial Analysis', 'Excel', 'QuickBooks', 'Reporting', 'Reconciliation'],
    },
    {
      firstName: 'Eric',
      lastName: 'Murphy',
      designation: 'Accountant',
      experience: 5,
      education: 'BS Accounting',
      university: 'University of Southern California',
      skills: ['Accounting', 'General Ledger', 'AP/AR', 'Month-end Close', 'Tax'],
    },
    {
      firstName: 'Karen',
      lastName: 'Bailey',
      designation: 'Junior Accountant',
      experience: 2,
      education: 'BS Accounting',
      university: 'Boston College',
      skills: ['Bookkeeping', 'Data Entry', 'Reconciliation', 'Excel', 'QuickBooks'],
    },
  ],

  'Human Resources': [
    {
      firstName: 'Elizabeth',
      lastName: 'Rivera',
      designation: 'HR Director',
      experience: 10,
      education: 'MBA HR Management',
      university: 'Cornell University',
      skills: ['HR Strategy', 'Talent Management', 'Compensation', 'Compliance', 'Leadership'],
    },
    {
      firstName: 'Matthew',
      lastName: 'Cooper',
      designation: 'HR Manager',
      experience: 6,
      education: 'MS Human Resources',
      university: 'Georgetown University',
      skills: ['Recruitment', 'Onboarding', 'Employee Relations', 'HRIS', 'Performance Mgmt'],
    },
    {
      firstName: 'Rebecca',
      lastName: 'Richardson',
      designation: 'Recruiter',
      experience: 4,
      education: 'BS Psychology',
      university: 'University of Washington',
      skills: ['Recruiting', 'Sourcing', 'Interviewing', 'LinkedIn', 'ATS', 'Networking'],
    },
    {
      firstName: 'Christopher',
      lastName: 'Cox',
      designation: 'HR Generalist',
      experience: 3,
      education: 'BS Business Administration',
      university: 'University of Minnesota',
      skills: ['Employee Relations', 'Benefits', 'Policies', 'Compliance', 'Training'],
    },
    {
      firstName: 'Ashley',
      lastName: 'Howard',
      designation: 'HR Coordinator',
      experience: 2,
      education: 'BS Human Resources',
      university: 'University of Wisconsin',
      skills: ['Onboarding', 'Documentation', 'HRIS', 'Coordination', 'Communication'],
    },
  ],

  'Customer Support': [
    {
      firstName: 'Jason',
      lastName: 'Ward',
      designation: 'Support Team Lead',
      experience: 8,
      education: 'BS Business',
      university: 'University of Arizona',
      skills: ['Team Leadership', 'Customer Service', 'Zendesk', 'Escalations', 'Metrics'],
    },
    {
      firstName: 'Christina',
      lastName: 'Torres',
      designation: 'Senior Support Specialist',
      experience: 5,
      education: 'BA Communications',
      university: 'University of Colorado',
      skills: ['Customer Support', 'Troubleshooting', 'Documentation', 'Training'],
    },
    {
      firstName: 'Timothy',
      lastName: 'Peterson',
      designation: 'Technical Support Specialist',
      experience: 4,
      education: 'BS Information Technology',
      university: 'Clemson University',
      skills: ['Technical Support', 'Debugging', 'SQL', 'API Integration', 'Zendesk'],
    },
    {
      firstName: 'Kimberly',
      lastName: 'Gray',
      designation: 'Customer Success Manager',
      experience: 4,
      education: 'BS Marketing',
      university: 'University of Georgia',
      skills: ['Customer Success', 'Relationship Building', 'Retention', 'Upselling'],
    },
    {
      firstName: 'Brandon',
      lastName: 'Ramirez',
      designation: 'Support Representative',
      experience: 2,
      education: 'BA Psychology',
      university: 'University of Miami',
      skills: ['Customer Service', 'Communication', 'Problem Solving', 'CRM', 'Empathy'],
    },
  ],

  'Operations': [
    {
      firstName: 'Nancy',
      lastName: 'James',
      designation: 'Operations Director',
      experience: 11,
      education: 'MBA Operations',
      university: 'Duke University',
      skills: ['Operations Strategy', 'Process Improvement', 'Project Management', 'Lean Six Sigma'],
    },
    {
      firstName: 'Gregory',
      lastName: 'Watson',
      designation: 'Operations Manager',
      experience: 7,
      education: 'BS Industrial Engineering',
      university: 'Georgia Tech',
      skills: ['Operations Management', 'Logistics', 'Supply Chain', 'Analytics', 'ERP'],
    },
    {
      firstName: 'Melissa',
      lastName: 'Brooks',
      designation: 'Project Manager',
      experience: 5,
      education: 'BS Business Management',
      university: 'University of Virginia',
      skills: ['Project Management', 'Agile', 'Scrum', 'Jira', 'Stakeholder Management'],
    },
    {
      firstName: 'Scott',
      lastName: 'Kelly',
      designation: 'Business Analyst',
      experience: 4,
      education: 'BS Business Analytics',
      university: 'University of North Carolina',
      skills: ['Business Analysis', 'Requirements Gathering', 'Process Mapping', 'SQL'],
    },
    {
      firstName: 'Heather',
      lastName: 'Sanders',
      designation: 'Operations Coordinator',
      experience: 3,
      education: 'BS Operations Management',
      university: 'Texas A&M',
      skills: ['Coordination', 'Scheduling', 'Documentation', 'Data Entry', 'Communication'],
    },
  ],

  'Data & Analytics': [
    {
      firstName: 'Benjamin',
      lastName: 'Price',
      designation: 'Head of Analytics',
      experience: 10,
      education: 'PhD Data Science',
      university: 'Stanford University',
      skills: ['Data Strategy', 'Machine Learning', 'Python', 'R', 'Leadership', 'Big Data'],
    },
    {
      firstName: 'Stephanie',
      lastName: 'Bennett',
      designation: 'Senior Data Scientist',
      experience: 7,
      education: 'MS Data Science',
      university: 'UC Berkeley',
      skills: ['Machine Learning', 'Python', 'TensorFlow', 'Statistical Modeling', 'NLP'],
    },
    {
      firstName: 'Jonathan',
      lastName: 'Wood',
      designation: 'Data Engineer',
      experience: 5,
      education: 'MS Computer Science',
      university: 'University of Michigan',
      skills: ['ETL', 'Data Pipelines', 'SQL', 'Python', 'Spark', 'Airflow', 'AWS'],
    },
    {
      firstName: 'Amy',
      lastName: 'Barnes',
      designation: 'Data Analyst',
      experience: 4,
      education: 'BS Statistics',
      university: 'University of Texas',
      skills: ['Data Analysis', 'SQL', 'Python', 'Tableau', 'Excel', 'Reporting'],
    },
    {
      firstName: 'Ryan',
      lastName: 'Ross',
      designation: 'Junior Data Analyst',
      experience: 2,
      education: 'BS Mathematics',
      university: 'University of California',
      skills: ['SQL', 'Excel', 'Data Visualization', 'Statistics', 'Tableau', 'Python'],
    },
  ],

  'Administration': [
    {
      firstName: 'Sharon',
      lastName: 'Henderson',
      designation: 'Office Manager',
      experience: 9,
      education: 'BS Business Administration',
      university: 'University of Denver',
      skills: ['Office Management', 'Administration', 'Coordination', 'Budgeting', 'Vendor Management'],
    },
    {
      firstName: 'Paul',
      lastName: 'Coleman',
      designation: 'Executive Assistant',
      experience: 6,
      education: 'BA Communications',
      university: 'University of Oregon',
      skills: ['Executive Support', 'Calendar Management', 'Travel', 'Communication', 'MS Office'],
    },
    {
      firstName: 'Deborah',
      lastName: 'Jenkins',
      designation: 'Administrative Manager',
      experience: 7,
      education: 'BS Management',
      university: 'University of Kansas',
      skills: ['Administration', 'Team Management', 'Scheduling', 'Records Management'],
    },
    {
      firstName: 'Gary',
      lastName: 'Perry',
      designation: 'Administrative Coordinator',
      experience: 4,
      education: 'BA Business',
      university: 'University of Missouri',
      skills: ['Coordination', 'Documentation', 'Meeting Planning', 'Office Support'],
    },
    {
      firstName: 'Sandra',
      lastName: 'Powell',
      designation: 'Administrative Assistant',
      experience: 3,
      education: 'AS Office Administration',
      university: 'Community College',
      skills: ['Office Support', 'Data Entry', 'Filing', 'Phone Management', 'Customer Service'],
    },
  ],
};

async function seedDepartmentEmployees() {
  try {
    console.log('🚀 SEEDING DEPARTMENT EMPLOYEES\n');
    console.log('=' .repeat(80));

    // Get Demo Organization tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Demo Organization' }
    });

    if (!tenant) {
      console.error('❌ Demo Organization tenant not found');
      return;
    }

    console.log('🏢 Tenant:', tenant.name);
    console.log('📊 Creating 5 employees for each department...\n');

    const tempPassword = await bcrypt.hash('temp123', 12);
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const [deptName, employees] of Object.entries(departmentTeams)) {
      console.log(`\n📁 ${deptName}`);
      console.log('-'.repeat(80));

      // Get department
      const department = await prisma.department.findFirst({
        where: {
          tenantId: tenant.id,
          name: deptName
        }
      });

      if (!department) {
        console.log(`   ⚠️  Department not found, skipping...`);
        continue;
      }

      for (const emp of employees) {
        const email = `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@demo.com`;
        const employeeId = `EMP-${deptName.substring(0, 3).toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          console.log(`   ⏭️  ${emp.firstName} ${emp.lastName} - Already exists`);
          totalSkipped++;
          continue;
        }

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            firstName: emp.firstName,
            lastName: emp.lastName,
            name: `${emp.firstName} ${emp.lastName}`,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            tenantId: tenant.id,
            departmentId: department.id,
            password: tempPassword,
            emailVerified: true,
            employeeId,
          }
        });

        // Create employee record
        await prisma.employee.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            employeeNumber: employeeId,
            departmentId: department.id,
            jobTitle: emp.designation,
            managerId: null,
            startDate: new Date(new Date().setFullYear(new Date().getFullYear() - Math.floor(emp.experience / 2))),
            employmentType: 'FULL_TIME',
            status: 'ACTIVE',
            emergencyContacts: {
              primary: {
                name: `${emp.firstName} Contact`,
                relationship: 'Family',
                phone: `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
              }
            }
          }
        });

        // Create employee profile
        await prisma.employeeProfile.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            dateOfBirth: new Date(1990 - emp.experience, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            gender: ['Male', 'Female'][Math.floor(Math.random() * 2)],
            personalEmail: `${emp.firstName.toLowerCase()}.personal@gmail.com`,
            personalPhone: `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            currentAddress: {
              street: `${Math.floor(Math.random() * 9999) + 1} ${emp.lastName} Street`,
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA'
            },
            permanentAddress: {
              street: `${Math.floor(Math.random() * 9999) + 1} ${emp.lastName} Street`,
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA'
            },
            sameAsCurrentAddress: true,
            highestQualification: emp.education,
            university: emp.university,
            yearOfPassing: new Date().getFullYear() - emp.experience - 2,
            yearsOfExperience: emp.experience,
            skills: { technical: emp.skills, soft: ['Communication', 'Teamwork', 'Problem Solving'] },
            emergencyContactName: `${emp.firstName} Contact`,
            emergencyRelationship: 'Family',
            emergencyPhone: `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            informationAccurate: true,
            agreeToPolocies: true,
            consentVerification: true,
          }
        });

        console.log(`   ✅ ${emp.firstName} ${emp.lastName} - ${emp.designation}`);
        totalCreated++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ SEEDING COMPLETED!\n');
    console.log('   Total Employees Created:', totalCreated);
    console.log('   Total Skipped (existed):', totalSkipped);
    console.log('   Departments Populated:', Object.keys(departmentTeams).length);
    console.log('\n🔑 All employees can login with OTP: 123456 (Development Mode)');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDepartmentEmployees();
