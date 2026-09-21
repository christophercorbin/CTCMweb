export const enableDemoMode = () => {
  const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJkZW1vQGN0Y20uY29tIiwicm9sZSI6ImN1c3RvbWVyIn0.demo';
  localStorage.setItem('access_token', demoToken);
  localStorage.setItem('user', JSON.stringify({
    id: '1',
    email: 'demo@ctcm.com',
    role: 'customer'
  }));
};

export const enableAdminDemoMode = () => {
  const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBjdGNtLmNvbSIsInJvbGUiOiJhZG1pbiJ9.demo';
  localStorage.setItem('access_token', adminToken);
  localStorage.setItem('user', JSON.stringify({
    id: '1',
    email: 'admin@ctcm.com',
    role: 'admin'
  }));
};
