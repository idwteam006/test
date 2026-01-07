const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateManagerProfile() {
  try {
    console.log('🔧 Updating Manager Profile: manager@addtechno.com\n');

    // Get manager user
    const user = await prisma.user.findUnique({
      where: { email: 'manager@addtechno.com' },
      include: {
        employee: true,
        employeeProfile: true,
        tenant: true,
      }
    });

    if (!user) {
      console.error('❌ User not found: manager@addtechno.com');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Role:', user.role);
    console.log('   Tenant:', user.tenant.name);
    console.log('');

    // Check if profile exists
    if (user.employeeProfile) {
      console.log('✅ Employee Profile already exists');
      console.log('   Updating with complete details...\n');

      // Update existing profile
      await prisma.employeeProfile.update({
        where: { userId: user.id },
        data: {
          middleName: 'Michael',
          preferredName: 'John',
          dateOfBirth: new Date('1985-05-15'),
          gender: 'Male',
          personalEmail: 'john.manager.personal@gmail.com',
          personalPhone: '+1-555-0123',
          alternatePhone: '+1-555-0124',
          bloodGroup: 'O+',
          maritalStatus: 'Married',

          // Current Address
          currentAddress: {
            street: '123 Manager Avenue',
            apt: 'Suite 100',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'United States'
          },

          // Permanent Address
          permanentAddress: {
            street: '123 Manager Avenue',
            apt: 'Suite 100',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'United States'
          },
          sameAsCurrentAddress: true,

          // Education
          highestQualification: 'MBA',
          fieldOfStudy: 'Business Administration',
          university: 'Harvard Business School',
          yearOfPassing: 2010,
          certifications: 'PMP, Six Sigma Black Belt, Agile Scrum Master',

          // Professional Experience
          previousCompany: 'Tech Corp Inc',
          previousDesignation: 'Senior Project Manager',
          yearsOfExperience: 12,

          // Skills
          skills: {
            technical: [
              'Project Management',
              'Strategic Planning',
              'Budget Management',
              'Risk Management',
              'Agile & Scrum',
              'MS Office Suite',
              'JIRA',
              'Confluence'
            ],
            soft: [
              'Leadership',
              'Team Building',
              'Communication',
              'Decision Making',
              'Problem Solving',
              'Conflict Resolution',
              'Time Management',
              'Mentoring'
            ],
            languages: ['English (Native)', 'Spanish (Fluent)', 'French (Basic)']
          },

          // Professional Links
          linkedinUrl: 'https://linkedin.com/in/johnmanager',
          githubUrl: 'https://github.com/johnmanager',
          portfolioUrl: 'https://johnmanager.com',

          // Emergency Contact
          emergencyContactName: 'Jane Manager',
          emergencyRelationship: 'Spouse',
          emergencyPhone: '+1-555-0125',
          emergencyAlternatePhone: '+1-555-0126',
          emergencyEmail: 'jane.manager@gmail.com',

          // Bank Details
          accountHolderName: 'John Michael Manager',
          accountNumber: '1234567890',
          accountType: 'Savings',
          bankName: 'Chase Bank',
          ifscCode: 'CHAS0001234',
          branchName: 'New York Main Branch',

          // Consent & Agreements
          informationAccurate: true,
          agreeToPolocies: true,
          consentVerification: true,
          codeOfConductAgreement: true,
          dataPrivacyConsent: true,
        }
      });

      console.log('✅ Employee Profile Updated Successfully!\n');
    } else {
      console.log('⚠️  Employee Profile does not exist, creating new one...\n');

      // Create new profile
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          middleName: 'Michael',
          preferredName: 'John',
          dateOfBirth: new Date('1985-05-15'),
          gender: 'Male',
          personalEmail: 'john.manager.personal@gmail.com',
          personalPhone: '+1-555-0123',
          alternatePhone: '+1-555-0124',
          bloodGroup: 'O+',
          maritalStatus: 'Married',

          // Current Address
          currentAddress: {
            street: '123 Manager Avenue',
            apt: 'Suite 100',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'United States'
          },

          // Permanent Address
          permanentAddress: {
            street: '123 Manager Avenue',
            apt: 'Suite 100',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'United States'
          },
          sameAsCurrentAddress: true,

          // Education
          highestQualification: 'MBA',
          fieldOfStudy: 'Business Administration',
          university: 'Harvard Business School',
          yearOfPassing: 2010,
          certifications: 'PMP, Six Sigma Black Belt, Agile Scrum Master',

          // Professional Experience
          previousCompany: 'Tech Corp Inc',
          previousDesignation: 'Senior Project Manager',
          yearsOfExperience: 12,

          // Skills
          skills: {
            technical: [
              'Project Management',
              'Strategic Planning',
              'Budget Management',
              'Risk Management',
              'Agile & Scrum',
              'MS Office Suite',
              'JIRA',
              'Confluence'
            ],
            soft: [
              'Leadership',
              'Team Building',
              'Communication',
              'Decision Making',
              'Problem Solving',
              'Conflict Resolution',
              'Time Management',
              'Mentoring'
            ],
            languages: ['English (Native)', 'Spanish (Fluent)', 'French (Basic)']
          },

          // Professional Links
          linkedinUrl: 'https://linkedin.com/in/johnmanager',
          githubUrl: 'https://github.com/johnmanager',
          portfolioUrl: 'https://johnmanager.com',

          // Emergency Contact
          emergencyContactName: 'Jane Manager',
          emergencyRelationship: 'Spouse',
          emergencyPhone: '+1-555-0125',
          emergencyAlternatePhone: '+1-555-0126',
          emergencyEmail: 'jane.manager@gmail.com',

          // Bank Details
          accountHolderName: 'John Michael Manager',
          accountNumber: '1234567890',
          accountType: 'Savings',
          bankName: 'Chase Bank',
          ifscCode: 'CHAS0001234',
          branchName: 'New York Main Branch',

          // Consent & Agreements
          informationAccurate: true,
          agreeToPolocies: true,
          consentVerification: true,
          codeOfConductAgreement: true,
          dataPrivacyConsent: true,
        }
      });

      console.log('✅ Employee Profile Created Successfully!\n');
    }

    // Display summary
    const updatedProfile = await prisma.employeeProfile.findUnique({
      where: { userId: user.id }
    });

    console.log('=' .repeat(80));
    console.log('✅ MANAGER PROFILE COMPLETE\n');
    console.log('=' .repeat(80));
    console.log('\n📧 Email: manager@addtechno.com');
    console.log('👤 Name: John Michael Manager');
    console.log('🏢 Company: ADD Technologies');
    console.log('💼 Job Title: Department Manager');
    console.log('📅 DOB:', updatedProfile.dateOfBirth.toLocaleDateString());
    console.log('📞 Phone:', updatedProfile.personalPhone);
    console.log('📧 Personal Email:', updatedProfile.personalEmail);
    console.log('🏠 Address:', updatedProfile.currentAddress.street + ', ' + updatedProfile.currentAddress.city);
    console.log('🎓 Education:', updatedProfile.highestQualification + ' - ' + updatedProfile.university);
    console.log('💼 Experience:', updatedProfile.yearsOfExperience + ' years');
    console.log('🏆 Certifications:', updatedProfile.certifications);
    console.log('👨‍👩‍👧 Emergency Contact:', updatedProfile.emergencyContactName + ' (' + updatedProfile.emergencyRelationship + ')');
    console.log('🏦 Bank:', updatedProfile.bankName);
    console.log('\n✅ All onboarding details completed!');
    console.log('✅ All consents and agreements: YES');
    console.log('\n' + '=' .repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateManagerProfile();
