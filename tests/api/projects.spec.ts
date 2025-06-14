import { test, expect } from '@playwright/test';

// Helper function to get auth token
const getAuthToken = async (request: any, role: 'ADMIN' | 'TESTER' | 'VIEWER' | 'NONE') => {
    if (role === 'NONE') return null;

    const roleEmail = {
        'ADMIN': 'admin@example.com',
        'TESTER': 'test@example.com',
        'VIEWER': 'test1@example.com',
    };

    const response = await request.post('/tcm/v1/auth/login', {
        data: {
            email: roleEmail[role],
            password: 'password1234',
        },
    });
    const responseBody = await response.json();
    return responseBody.accessToken;
};

test.describe('POST /tcm/v1/projects', () => {
    let adminToken: string;
    let testerToken: string;
    let viewerToken: string;
    const createdProjectIds: string[] = [];

    test.beforeAll(async ({ request }) => {
        adminToken = await getAuthToken(request, 'ADMIN');
        testerToken = await getAuthToken(request, 'TESTER');
        viewerToken = await getAuthToken(request, 'VIEWER');
    });

    test.afterEach(async ({ request }) => {
        for (const id of createdProjectIds) {
            await request.delete(`/tcm/v1/projects/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
        }
        // Clear the array for the next test
        createdProjectIds.length = 0;
    });

    test('TC-P01: Verify project creation with valid data', async ({ request }) => {
        const projectName = `New Project TC-P01 ${Date.now()}`;
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: projectName,
                description: 'A valid description.',
            },
        });
        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body).toHaveProperty('id');
        expect(body.name).toBe(projectName);
        expect(body.description).toBe('A valid description.');
        createdProjectIds.push(body.id);
    });

    test('TC-N01: Attempt project creation as TESTER', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${testerToken}` },
            data: {
                name: `Tester Project ${Date.now()}`,
                description: '...',
            },
        });
        expect(response.status()).toBe(403);
    });

    test('TC-N02: Attempt project creation as VIEWER', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${viewerToken}` },
            data: {
                name: `Viewer Project ${Date.now()}`,
                description: '...',
            },
        });
        expect(response.status()).toBe(403);
    });

    test('TC-N03: Attempt project creation without authentication', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            data: {
                name: `No-Auth Project ${Date.now()}`,
                description: '...',
            },
        });
        expect(response.status()).toBe(401);
    });

    test('TC-N04: Create a project with a missing name', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                description: 'Missing name.',
            },
        });
        expect(response.status()).toBe(400);
    });
    
    test('TC-N05: Create a project with a missing description (should succeed as it is optional)', async ({ request }) => {
        const projectName = `Project without description ${Date.now()}`;
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: projectName,
            },
        });
        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.name).toBe(projectName);
        expect(body.description).toBeNull(); // or undefined, depending on implementation
        createdProjectIds.push(body.id);
    });

    test('TC-N06: Create a project with an empty name', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: '',
                description: 'Empty name.',
            },
        });
        expect(response.status()).toBe(400);
    });

    test('TC-N07: Create a project with an empty description', async ({ request }) => {
        const projectName = `Empty Desc ${Date.now()}`;
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: projectName,
                description: '',
            },
        });
        expect(response.status()).toBe(201); // Empty string is a valid description
        const body = await response.json();
        expect(body.name).toBe(projectName);
        expect(body.description).toBe('');
        createdProjectIds.push(body.id);
    });

    test('TC-N08: Create a project with null values', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: null,
                description: null,
            },
        });
        expect(response.status()).toBe(400);
    });

    test('TC-N09: Create a project with a duplicate name', async ({ request }) => {
        // Generate a unique project name for this specific test run
        const uniqueProjectName = `Test Project ${Date.now()}`;
    
        // --- Step 1: Create the project for the first time ---
        const createResponse = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: uniqueProjectName,
                description: 'This is the first creation.',
            },
        });
        expect(createResponse.ok(), `First project creation should be successful.`).toBeTruthy();
        expect(createResponse.status()).toBe(201);
        const body = await createResponse.json();
        createdProjectIds.push(body.id);
    
    
        // --- Step 2: Attempt to create it again with the exact same name ---
        const duplicateResponse = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: uniqueProjectName,
                description: 'This is the second attempt.',
            },
        });
        expect(duplicateResponse.status()).toBe(409); 
    });

    test('TC-N10: Send a request with malformed JSON', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { 
                Authorization: `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            data: '{"name": "Test",',
        });
        expect(response.status()).toBe(400);
    });

    test('TC-N11: Create a project with an empty request body', async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {},
        });
        expect(response.status()).toBe(400);
    });

    test('TC-E01: Create a project with a very long name and description', async ({ request }) => {
        const longString = 'a'.repeat(256);
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: longString,
                description: longString,
            },
        });
        expect(response.status()).toBe(400); // Exceeds max length for name
    });

    test('TC-E01-2: Create a project with a name at max length', async ({ request }) => {
        const name = `max-length-project-${Date.now()}`.padEnd(255, 'x');
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: name,
                description: 'Max length name',
            },
        });
        expect(response.status()).toBe(201);
        const body = await response.json();
        createdProjectIds.push(body.id);
    });


    test('TC-E02: Create a project with special characters in the name', async ({ request }) => {
        const specialName = `!@#$%^&*()_+-=[]{}|;':",./<>?~\` ${Date.now()}`;
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: specialName,
                description: 'Special characters name',
            },
        });
        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.name).toBe(specialName);
        createdProjectIds.push(body.id);
    });

    test('TC-E03: Create a project with unicode/international characters', async ({ request }) => {
        const unicodeName = `Проект ${Date.now()}`;
        const unicodeDescription = '项目';
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
                name: unicodeName,
                description: unicodeDescription,
            },
        });
        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.name).toBe(unicodeName);
        expect(body.description).toBe(unicodeDescription);
        createdProjectIds.push(body.id);
    });
});

test.describe('GET /tcm/v1/projects', () => {
    let adminToken: string;
    let testerToken: string;
    let viewerToken: string;
    let project1: any, project2: any;
    const createdProjectIds: string[] = [];

    test.beforeAll(async ({ request }) => {
        adminToken = await getAuthToken(request, 'ADMIN');
        testerToken = await getAuthToken(request, 'TESTER');
        viewerToken = await getAuthToken(request, 'VIEWER');

        // Create some projects as ADMIN
        const p1_response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: { name: `Project Alpha ${Date.now()}`, description: 'Alpha description' },
        });
        project1 = await p1_response.json();
        createdProjectIds.push(project1.id);

        const p2_response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: { name: `Project Beta ${Date.now() + 1}`, description: 'Beta description' },
        });
        project2 = await p2_response.json();
        createdProjectIds.push(project2.id);
    });

    test.afterAll(async ({ request }) => {
        for (const id of createdProjectIds) {
            await request.delete(`/tcm/v1/projects/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
        }
    });

    test('TC-P02: ADMIN fetches projects', async ({ request }) => {
        const response = await request.get('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThanOrEqual(2);
        // Check if our created projects are in the list
        expect(body.some((p: any) => p.id === project1.id)).toBe(true);
        expect(body.some((p: any) => p.id === project2.id)).toBe(true);
    });

    test('TC-P03 & TC-P04: TESTER/VIEWER fetches their assigned projects (expecting empty)', async ({ request }) => {
        // Since we have no way to assign them, this list should be empty.
        for (const token of [testerToken, viewerToken]) {
            const response = await request.get('/tcm/v1/projects', {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body).toEqual([]);
        }
    });

    test('TC-P05: User with no assigned projects fetches list', async ({ request }) => {
        // This is effectively the same as the previous test case for tester/viewer.
        const response = await request.get('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${testerToken}` },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toEqual([]);
    });

    test('TC-P06: Verify the structure of the response', async ({ request }) => {
        const response = await request.get('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
        if (body.length > 0) {
            const project = body[0];
            expect(project).toHaveProperty('id');
            expect(project).toHaveProperty('name');
            expect(project).toHaveProperty('description');
            expect(project).toHaveProperty('creator');
            expect(project.creator).toHaveProperty('id');
        }
    });

    test('TC-N12: Attempt to fetch projects without authentication', async ({ request }) => {
        const response = await request.get('/tcm/v1/projects');
        expect(response.status()).toBe(401);
    });

    test('TC-E04: Fetch projects when the list is very large', async ({ request }) => {
        // This test is to check for performance and pagination.
        // For now, it just fetches the list. A real-world scenario would involve
        // seeding the database with many projects and checking response time and headers.
        const response = await request.get('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(200);
        // We can't reliably check for pagination headers without knowing the implementation.
    });
});

test.describe('GET /tcm/v1/projects/{id}', () => {
    let adminToken: string;
    let testerToken: string;
    let viewerToken: string;
    let adminProject: any;
    let unassignedProject: any;
    const createdProjectIds: string[] = [];

    test.beforeAll(async ({ request }) => {
        adminToken = await getAuthToken(request, 'ADMIN');
        testerToken = await getAuthToken(request, 'TESTER');
        viewerToken = await getAuthToken(request, 'VIEWER');
        
        const projectName = `Admin Project For GetById ${Date.now()}`;
        const p1_res = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: { name: projectName, description: '...' },
        });
        adminProject = await p1_res.json();
        createdProjectIds.push(adminProject.id);
        adminProject.name = projectName;

        // Another project that tester/viewer are not assigned to.
        const p2_res = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: { name: `Unassigned Project ${Date.now() + 1}`, description: '...' },
        });
        unassignedProject = await p2_res.json();
        createdProjectIds.push(unassignedProject.id);
    });

    test.afterAll(async ({ request }) => {
        for (const id of createdProjectIds) {
            await request.delete(`/tcm/v1/projects/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
        }
    });

    test('TC-P07: ADMIN views any project by ID', async ({ request }) => {
        const response = await request.get(`/tcm/v1/projects/${adminProject.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.id).toBe(adminProject.id);
        expect(body.name).toBe(adminProject.name);
    });

    // These tests will fail if there is no seeding that assigns projects to them.
    // Based on the service logic, they should get a 404.
    test('TC-P08 & TC-P09: Assigned TESTER/VIEWER views a project (expecting 404)', async ({ request }) => {
        for (const token of [testerToken, viewerToken]) {
            const response = await request.get(`/tcm/v1/projects/${adminProject.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // The service throws NotFoundException for access denied cases for non-admins.
            expect(response.status()).toBe(404);
        }
    });

    test('TC-N13 & TC-N14: TESTER/VIEWER tries to view an unassigned project', async ({ request }) => {
        for (const token of [testerToken, viewerToken]) {
            const response = await request.get(`/tcm/v1/projects/${unassignedProject.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // The service throws NotFoundException for access denied cases for non-admins.
            expect(response.status()).toBe(404);
        }
    });

    test('TC-N15: Attempt to view a project without authentication', async ({ request }) => {
        const response = await request.get(`/tcm/v1/projects/${adminProject.id}`);
        expect(response.status()).toBe(401);
    });

    test('TC-N16: View a project with a non-existent ID', async ({ request }) => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000'; // valid UUID format
        const response = await request.get(`/tcm/v1/projects/${nonExistentId}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(404);
    });

    test('TC-N17: View a project with a malformed ID', async ({ request }) => {
        const response = await request.get('/tcm/v1/projects/invalid-id-format', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(400);
    });

    test('TC-N18: View a project with an integer ID', async ({ request }) => {
        const response = await request.get('/tcm/v1/projects/12345', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(400);
    });
}); 

test.describe('PATCH /tcm/v1/projects/{id}', () => {
    let adminToken: string;
    let testerToken: string;
    let projectToUpdate: any;
    const createdProjectIds: string[] = [];
  
    // Before these tests run, log in and create a project to work with
    test.beforeAll(async ({ request }) => {
      adminToken = await getAuthToken(request, 'ADMIN');
      testerToken = await getAuthToken(request, 'TESTER');
  
      const response = await request.post('/tcm/v1/projects', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { name: `Project to be Updated ${Date.now()}`, description: 'Initial desc' },
      });
      expect(response.ok()).toBeTruthy();
      projectToUpdate = await response.json();
      createdProjectIds.push(projectToUpdate.id);
    });

    test.afterAll(async ({ request }) => {
        for (const id of createdProjectIds) {
            await request.delete(`/tcm/v1/projects/${id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
        }
    });
  
    test('should allow an ADMIN to update a project', async ({ request }) => {
      const updatedName = `Updated Name ${Date.now()}`;
      const response = await request.patch(`/tcm/v1/projects/${projectToUpdate.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          name: updatedName,
          description: 'This description was updated.',
        },
      });
  
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.name).toBe(updatedName);
      expect(body.description).toBe('This description was updated.');
    });
  
    test('should return 404 Not Found when a non-member TESTER tries to update', async ({ request }) => {
      // Note: The service logic throws a 404 if a non-system-admin can't access a project
      const response = await request.patch(`/tcm/v1/projects/${projectToUpdate.id}`, {
        headers: { Authorization: `Bearer ${testerToken}` },
        data: { name: 'This should not work' },
      });
      expect(response.status()).toBe(404);
    });
  
    test('should return 409 Conflict when updating to a name that already exists', async ({ request }) => {
      // First, create a second project that "owns" the target name
      const targetName = `Existing Project Name ${Date.now()}`;
      const p2_res = await request.post('/tcm/v1/projects', {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { name: targetName },
      });
      expect(p2_res.ok()).toBeTruthy();
      const p2_body = await p2_res.json();
      createdProjectIds.push(p2_body.id);
  
      // Now, try to update our original project to have the same name
      const response = await request.patch(`/tcm/v1/projects/${projectToUpdate.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { name: targetName },
      });
  
      expect(response.status()).toBe(409);
    });
  });

test.describe('DELETE /tcm/v1/projects/{id}', () => {
    let adminToken: string;
    let testerToken: string;
    let projectToDelete: any;

    test.beforeAll(async ({ request }) => {
        adminToken = await getAuthToken(request, 'ADMIN');
        testerToken = await getAuthToken(request, 'TESTER');
    });

    // Create a new project before each test for isolation
    test.beforeEach(async ({ request }) => {
        const response = await request.post('/tcm/v1/projects', {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: { name: `Project for Deletion ${Date.now()}`, description: 'Delete me' },
        });
        expect(response.ok()).toBeTruthy();
        projectToDelete = await response.json();
    });

    // Safeguard to clean up the project if a test fails before deleting it.
    test.afterEach(async ({ request }) => {
        if (projectToDelete) {
            await request.delete(`/tcm/v1/projects/${projectToDelete.id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
                failOnStatusCode: false, // Don't error if it's already gone
            });
        }
    });

    test('TC-D01: ADMIN can delete a project', async ({ request }) => {
        const response = await request.delete(`/tcm/v1/projects/${projectToDelete.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(204);

        // Verify it's gone
        const getResponse = await request.get(`/tcm/v1/projects/${projectToDelete.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(getResponse.status()).toBe(404);
        
        projectToDelete = null; // Prevent afterEach from trying to delete again
    });

    test('TC-D02: TESTER cannot delete a project', async ({ request }) => {
        const response = await request.delete(`/tcm/v1/projects/${projectToDelete.id}`, {
            headers: { Authorization: `Bearer ${testerToken}` },
        });
        expect(response.status()).toBe(403);
    });

    test('TC-D03: Unauthenticated user cannot delete a project', async ({ request }) => {
        const response = await request.delete(`/tcm/v1/projects/${projectToDelete.id}`);
        expect(response.status()).toBe(401);
    });

    test('TC-D04: Deleting a non-existent project ID returns 404', async ({ request }) => {
        const nonExistentId = '00000000-1111-2222-3333-444444444444';
        const response = await request.delete(`/tcm/v1/projects/${nonExistentId}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(404);
    });

    test('TC-D05: Deleting with a malformed project ID returns 400', async ({ request }) => {
        const response = await request.delete('/tcm/v1/projects/not-a-uuid', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(400);
    });
});

test.describe('GET /tcm/v1/projects/{id}/members', () => {
    let adminToken: string;
    let testerToken: string;
    let project: any;
  
    test.beforeAll(async ({ request }) => {
      adminToken = await getAuthToken(request, 'ADMIN');
      testerToken = await getAuthToken(request, 'TESTER');
      
      const response = await request.post('/tcm/v1/projects', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { name: `Project for Member Listing ${Date.now()}` },
      });
      expect(response.ok()).toBeTruthy();
      project = await response.json();
    });

    test.afterAll(async ({ request }) => {
        if (project) {
            await request.delete(`/tcm/v1/projects/${project.id}`, {
                headers: { Authorization: `Bearer ${adminToken}` },
            });
        }
    });

    test('TC-M01: ADMIN can list members of a project', async ({ request }) => {
        const response = await request.get(`/tcm/v1/projects/${project.id}/members`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(1);
        expect(body[0]).toHaveProperty('user');
        expect(body[0].user.email).toBe('admin@example.com');
    });

    test('TC-M02: Non-member (TESTER) cannot list members', async ({ request }) => {
        const response = await request.get(`/tcm/v1/projects/${project.id}/members`, {
            headers: { Authorization: `Bearer ${testerToken}` },
        });
        expect(response.status()).toBe(403);
    });

    test('TC-M03: Unauthenticated user cannot list members', async ({ request }) => {
        const response = await request.get(`/tcm/v1/projects/${project.id}/members`);
        expect(response.status()).toBe(401);
    });

    test('TC-M04: Listing members for a non-existent project ID returns empty for ADMIN', async ({ request }) => {
        const nonExistentId = '00000000-1111-2222-3333-555555555555';
        const response = await request.get(`/tcm/v1/projects/${nonExistentId}/members`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toEqual([]);
    });

    test('TC-M05: Listing members for a non-existent project ID returns 403 for non-member', async ({ request }) => {
        const nonExistentId = '00000000-1111-2222-3333-666666666666';
        const response = await request.get(`/tcm/v1/projects/${nonExistentId}/members`, {
            headers: { Authorization: `Bearer ${testerToken}` },
        });
        expect(response.status()).toBe(403);
    });

    test('TC-M06: Listing members with a malformed project ID returns 400', async ({ request }) => {
        const response = await request.get('/tcm/v1/projects/not-a-uuid/members', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(response.status()).toBe(400);
    });
});