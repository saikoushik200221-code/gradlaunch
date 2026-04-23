const fs = require('fs');
const file = "c:\\Users\\saiko\\OneDrive\\Desktop\\jobapplication\\frontend\\src\\GradLaunch.jsx";
let content = fs.readFileSync(file, 'utf8');

// Find the start of const TABS = [
const startIdx = content.indexOf('  const TABS = [');
// Find the end of the return statement. It ends right before `export default function GradLaunch() {`
const endIdx = content.indexOf('export default function GradLaunch() {');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
  };

  if (showLoginForm) {
    return <AuthScreen onLogin={(user, token) => {
      localStorage.setItem("token", token);
      setAuthToken(token);
      setCurrentUser(user);
      setShowLoginForm(false);
    }} />;
  }

  return <AppShell currentUser={currentUser} token={authToken} onLogout={handleLogout} />;
}

`;
  
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  // ensure AppShell is imported
  if (!content.includes('import AppShell')) {
    content = content.replace('import JobSearch from "./components/JobSearch";', 'import JobSearch from "./components/JobSearch";\nimport AppShell from "./components/AppShell";');
  }
  fs.writeFileSync(file, content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find boundaries.");
}
