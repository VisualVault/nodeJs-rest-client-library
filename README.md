# visualvault-api

A Node.js client library that provides convenient access to the VisualVault REST API for server-side applications.

## Installation

```bash
npm install visualvault-api
```

## Requirements

- Node.js 20.0.0 or higher

## Quick Start

### Basic Authentication and Setup

```javascript
const vvRestApi = require('visualvault-api');

// Initialize authentication
const auth = new vvRestApi.authorize();

// Get authenticated client
auth.getVaultApi(
    'your-client-id',
    'your-client-secret',
    'username',
    'password',
    'your-audience',
    'https://your-vault-url.com',
    'customer-alias',
    'database-alias'
).then(client => {
    console.log('Successfully authenticated!');
    // Use the client for API calls
}).catch(error => {
    console.error('Authentication failed:', error);
});
```

### JWT Authentication

If you already have a JWT token:

```javascript
const auth = new vvRestApi.authorize();

auth.getVaultApiFromJwt(
    'your-jwt-token',
    'https://your-vault-url.com',
    'customer-alias',
    'database-alias',
    new Date('2024-12-31') // expiration date
).then(client => {
    console.log('JWT authentication successful!');
}).catch(error => {
    console.error('JWT authentication failed:', error);
});
```

## API Usage Examples

### Working with Documents

```javascript
// Get documents from a folder
client.library.getDocuments(params, folderId)
    .then(response => {
        const documents = JSON.parse(response);
        console.log('Documents:', documents.data);
    });

// Upload a new document
const documentData = {
    fileName: 'example.pdf',
    description: 'Example document',
    folderId: 'your-folder-id'
};

client.documents.postDocWithFile(documentData, fileBuffer)
    .then(response => {
        console.log('Document uploaded:', response);
    });

// Get document details
client.documents.getDocumentRevision(params, revisionId)
    .then(response => {
        const document = JSON.parse(response);
        console.log('Document details:', document);
    });
```

### Working with Forms

```javascript
// Get forms by template name
client.forms.getForms(params, 'Your Form Template Name')
    .then(response => {
        const forms = JSON.parse(response);
        console.log('Forms:', forms.data);
    });

// Create a new form instance
const formData = {
    field1: 'value1',
    field2: 'value2'
};

client.forms.postForms(params, formData, 'Your Form Template Name')
    .then(response => {
        console.log('Form created:', response);
    });

// Get form instance by ID
client.forms.getFormInstanceById(templateId, instanceId)
    .then(response => {
        const form = JSON.parse(response);
        console.log('Form instance:', form);
    });
```

### Working with Folders

```javascript
// Get folders
client.library.getFolders(params)
    .then(response => {
        const folders = JSON.parse(response);
        console.log('Folders:', folders.data);
    });

// Create a new folder
const folderData = {
    name: 'New Folder',
    description: 'Folder description'
};

client.library.postFolderByPath(params, folderData, '/Parent Folder/New Folder')
    .then(response => {
        console.log('Folder created:', response);
    });
```

### Working with Users

```javascript
// Get current user information
client.users.getUser(params)
    .then(response => {
        const user = JSON.parse(response);
        console.log('Current user:', user);
    });

// Get users in a site
client.users.getUsers(params, siteId)
    .then(response => {
        const users = JSON.parse(response);
        console.log('Users:', users.data);
    });
```

### Running Custom Queries

```javascript
// Execute a custom query by name
client.customQuery.getCustomQueryResultsByName('Your Query Name', params)
    .then(response => {
        const results = JSON.parse(response);
        console.log('Query results:', results.data);
    });
```

### Working with Files

```javascript
// Upload a file
const fileData = {
    fileName: 'document.pdf',
    description: 'My document'
};

client.files.postFile(fileData, fileBuffer)
    .then(response => {
        console.log('File uploaded:', response);
    });

// Download a file
client.files.getFileBytesId(fileId)
    .then(fileBuffer => {
        // Process the file buffer
        console.log('File downloaded, size:', fileBuffer.length);
    });
```

### Running Web Services

```javascript
// Execute a web service
const serviceData = {
    param1: 'value1',
    param2: 'value2'
};

client.scripts.runWebService('YourWebServiceName', serviceData)
    .then(response => {
        console.log('Web service result:', response);
    });
```

## API Modules

The client provides access to the following VisualVault API modules:

- **documents** - Document management operations
- **forms** - Form template and instance operations
- **library** - Folder and library management
- **users** - User management operations
- **groups** - Group management operations
- **sites** - Site management operations
- **files** - File upload/download operations
- **scripts** - Web service execution
- **customQuery** - Custom query execution
- **email** - Email operations
- **constants** - API constants and enums
- **scheduledProcess** - Scheduled process management
- **customer** - Customer management operations
- **projects** - Project management operations
- **indexFields** - Document Index field operations
- **outsideProcesses** - Outside process management
- **securityMembers** - Security member management
- **reports** - Report generation


## Error Handling

```javascript
client.documents.getDocuments(params, folderId)
    .then(response => {
        const result = JSON.parse(response);
        if (result.meta && result.meta.statusCode === 200) {
            console.log('Success:', result.data);
        } else {
            console.error('API Error:', result);
        }
    })
    .catch(error => {
        console.error('Request failed:', error);
    });
```

## Support

For more information about the VisualVault API, visit the [VisualVault documentation](https://docs.visualvault.com/).

For VisualVault micro service debugging assistance see [Readme-microservices](https://github.com/VisualVault/nodeJs-rest-client-library/blob/master/Readme-microservices.md).

## License

Use of the VisualVault API requires a customer hosting contract which defines all license terms.

## Repository

[GitHub Repository](https://github.com/VisualVault/nodeJs-rest-client-library)