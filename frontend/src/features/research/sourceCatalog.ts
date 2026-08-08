import type { ResearchCategory } from "../../stores/research";

export interface CatalogSource {
  title: string;
  url: string;
  category: Exclude<ResearchCategory, "Custom">;
  description: string;
  tags: string[];
}

export const sourceCatalog: CatalogSource[] = [
  { title: "CISA Known Exploited Vulnerabilities", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", category: "Cybersecurity", description: "Authoritative catalog of vulnerabilities known to be exploited in the wild.", tags: ["vulnerabilities", "kev", "cisa"] },
  { title: "NIST Cybersecurity Framework", url: "https://www.nist.gov/cyberframework", category: "Cybersecurity", description: "NIST guidance for managing and communicating cybersecurity risk.", tags: ["nist", "framework", "risk"] },
  { title: "NIST National Vulnerability Database", url: "https://nvd.nist.gov/", category: "Cybersecurity", description: "Standards-based vulnerability data and CVE analysis from NIST.", tags: ["nvd", "cve", "vulnerabilities"] },
  { title: "MITRE ATT&CK", url: "https://attack.mitre.org/", category: "Cybersecurity", description: "Knowledge base of adversary tactics and techniques for defenders.", tags: ["threat intelligence", "tactics", "mitre"] },
  { title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", category: "Cybersecurity", description: "Community standard for critical web application security risks.", tags: ["web security", "owasp", "appsec"] },
  { title: "CWE", url: "https://cwe.mitre.org/", category: "Cybersecurity", description: "MITRE catalog of software and hardware weakness types.", tags: ["weaknesses", "secure coding", "mitre"] },
  { title: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web", category: "Programming", description: "Primary reference for open web platform technologies.", tags: ["javascript", "html", "css", "web"] },
  { title: "Python Documentation", url: "https://docs.python.org/3/", category: "Programming", description: "Official Python language and standard library documentation.", tags: ["python", "stdlib", "language"] },
  { title: "TypeScript Documentation", url: "https://www.typescriptlang.org/docs/", category: "Programming", description: "Official TypeScript handbook, reference, and tutorials.", tags: ["typescript", "javascript", "types"] },
  { title: "React Learn", url: "https://react.dev/learn", category: "Programming", description: "Official React concepts, tutorials, and API guidance.", tags: ["react", "frontend", "javascript"] },
  { title: "The Rust Book", url: "https://doc.rust-lang.org/book/", category: "Programming", description: "Official guide to the Rust programming language.", tags: ["rust", "systems", "language"] },
  { title: "FastAPI Documentation", url: "https://fastapi.tiangolo.com/", category: "Programming", description: "Official FastAPI framework documentation and tutorials.", tags: ["python", "api", "backend"] },
  { title: "RFC Editor", url: "https://www.rfc-editor.org/", category: "Technology", description: "Canonical publication archive for Internet RFCs.", tags: ["internet", "standards", "protocols"] },
  { title: "W3C Standards", url: "https://www.w3.org/TR/", category: "Technology", description: "Technical reports and standards for the web platform.", tags: ["standards", "web", "w3c"] },
  { title: "Docker Documentation", url: "https://docs.docker.com/", category: "Technology", description: "Official container, Docker Engine, Compose, and deployment docs.", tags: ["docker", "containers", "devops"] },
  { title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/current/", category: "Technology", description: "Official documentation for the current PostgreSQL release.", tags: ["postgresql", "database", "sql"] },
  { title: "Git Reference", url: "https://git-scm.com/docs", category: "Technology", description: "Official Git command reference and guides.", tags: ["git", "version control", "tools"] },
  { title: "Epic Developer Documentation", url: "https://dev.epicgames.com/documentation/", category: "Games", description: "Official Epic documentation for Unreal Engine, UEFN, Verse, and services.", tags: ["unreal", "uefn", "verse", "epic"] },
  { title: "Unity Documentation", url: "https://docs.unity.com/", category: "Games", description: "Official Unity manuals, services, and API references.", tags: ["unity", "csharp", "game engine"] },
  { title: "Godot Documentation", url: "https://docs.godotengine.org/en/stable/", category: "Games", description: "Official documentation for the open-source Godot game engine.", tags: ["godot", "gdscript", "game engine"] },
  { title: "Microsoft Game Development", url: "https://learn.microsoft.com/en-us/gaming/", category: "Games", description: "Official Microsoft resources for Windows, Xbox, DirectX, and game development.", tags: ["xbox", "directx", "windows", "games"] },
];
