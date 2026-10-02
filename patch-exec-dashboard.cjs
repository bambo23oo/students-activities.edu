const fs = require('fs');
let code = fs.readFileSync('src/components/ExecutiveAdminDashboard.tsx', 'utf8');

// Update navItems label
code = code.replace(
  "{ id: 'approvals', label: 'K-P-A Approvals', icon: Award, badge: pendingReviewCount > 0 ? pendingReviewCount : undefined },",
  "{ id: 'approvals', label: 'Pending Approvals', icon: Award, badge: pendingReviewCount > 0 ? pendingReviewCount : undefined },"
);

// Add ApprovalManager import
if (!code.includes("import { ApprovalManager }")) {
  code = code.replace(
    "import { PeopleManager } from './admin/PeopleManager';",
    "import { PeopleManager } from './admin/PeopleManager';\nimport { ApprovalManager } from './admin/ApprovalManager';"
  );
}

// Add ApprovalManager route
if (!code.includes("activeTab === 'approvals'")) {
  code = code.replace(
    "{activeTab === 'people' && (",
    `{activeTab === 'approvals' && (
            <div className="space-y-4">
              <ApprovalManager />
            </div>
          )}

          {activeTab === 'people' && (`
  );
}

fs.writeFileSync('src/components/ExecutiveAdminDashboard.tsx', code);
