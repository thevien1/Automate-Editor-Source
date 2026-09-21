import { ActionCategory } from '../types/ui';

export const ACTION_CATEGORIES: ActionCategory[] = [
  {
    id: 'block',
    name: 'Block',
    count: 6,
    actions: [
      { type: 101, name: 'Normal block', category: 'Block', description: 'Container block for organizing actions' },
      { type: 102, name: 'For', category: 'Block', description: 'Loop with start, end, and step count' },
      { type: 103, name: 'While', category: 'Block', description: 'Loop until condition is false' },
      { type: 104, name: 'If', category: 'Block', description: 'Execute child nodes if condition is true' },
      { type: 105, name: 'Else if', category: 'Block', description: 'Alternative branch for If block' },
      { type: 106, name: 'Else', category: 'Block', description: 'Default fallback branch' },
    ]
  },
  {
    id: 'variables',
    name: 'Variables',
    count: 4,
    actions: [
      {
        type: 1,
        name: 'Set variable',
        category: 'Variables',
        description: 'Assign or create a variable with text, file path, checkbox or dropdown',
        hasOutVar: true,
        defaultRawInput: [
          { Key: 'VALUE', Value: '' },
          { Key: 'ALLOW_USER_INPUT', Value: 'False' },
          { Key: 'USER_INPUT_TYPE', Value: 'Text' },
          { Key: 'COMBOBOX_DATA', Value: '' },
          { Key: 'INPUT_REQUIRED', Value: 'False' }
        ]
      },
      {
        type: 2,
        name: 'Increase variable',
        category: 'Variables',
        description: 'Increment variable numeric value',
        hasOutVar: true,
        defaultRawInput: [
          { Key: 'CURRENT_VAL', Value: '' },
          { Key: 'INCREASE_BY', Value: '' }
        ]
      },
      {
        type: 3,
        name: 'Decrease variable',
        category: 'Variables',
        description: 'Decrement variable numeric value',
        hasOutVar: true,
        defaultRawInput: [
          { Key: 'CURRENT_VAL', Value: '' },
          { Key: 'DESCREASE_BY', Value: '' } // Note: intentionally DESCREASE_BY matching GPM spec
        ]
      },
      {
        type: 4,
        name: 'Count',
        category: 'Variables',
        description: 'Count elements in array or string length',
        hasOutVar: true,
        defaultRawInput: [{ Key: 'INPUT_ARRAY', Value: '' }]
      },
    ]
  },
  {
    id: 'workflow',
    name: 'Workflow',
    count: 5,
    actions: [
      { type: 5, name: 'Exit loop', category: 'Workflow', description: 'Break from nearest enclosing loop', defaultDelay: '0,0' },
      { type: 6, name: 'Next loop', category: 'Workflow', description: 'Continue to next iteration of loop', defaultDelay: '0,0' },
      { type: 76, name: 'Stop', category: 'Workflow', description: 'Stop current flow execution gracefully', defaultDelay: '0,0' },
      { type: 117, name: 'Throw', category: 'Workflow', description: 'Raise error with message', defaultRawInput: [{ Key: 'MESSAGE', Value: '' }], defaultDelay: '0,0' },
      { type: 7, name: 'Delay', category: 'Workflow', description: 'Wait specified milliseconds', defaultRawInput: [{ Key: 'MIN', Value: '' }, { Key: 'MAX', Value: '' }], defaultDelay: '0,0' },
    ]
  },
  {
    id: 'text_number',
    name: 'Text & Number',
    count: 7,
    actions: [
      { type: 8, name: 'Random text', category: 'Text & Number', description: 'Generate random string', hasOutVar: true, defaultRawInput: [{ Key: 'TEXT_LEN', Value: '' }] },
      { type: 9, name: 'Split text', category: 'Text & Number', description: 'Split string by delimiter into array', hasOutVar: true, defaultRawInput: [{ Key: 'INPUT_TEXT', Value: '' }, { Key: 'SPLIT_CHAR', Value: '' }] },
      { type: 10, name: 'Read json', category: 'Text & Number', description: 'Parse JSON and extract node path', hasOutVar: true, defaultRawInput: [{ Key: 'JSON', Value: '' }, { Key: 'NODES', Value: '' }] },
      { type: 82, name: 'Regex', category: 'Text & Number', description: 'Apply .NET regex pattern match', hasOutVar: true, defaultRawInput: [{ Key: 'TEXT', Value: '' }, { Key: 'REGEX', Value: '' }] },
      { type: 11, name: 'Random number', category: 'Text & Number', description: 'Generate random integer between min and max', hasOutVar: true, defaultRawInput: [{ Key: 'MIN', Value: '' }, { Key: 'MAX', Value: '' }] },
      { type: 12, name: 'Math execute', category: 'Text & Number', description: 'Calculate arithmetic expression', hasOutVar: true, defaultRawInput: [{ Key: 'MATH_EXPRESSION', Value: '' }] },
      { type: 81, name: '2FA code', category: 'Text & Number', description: 'Generate TOTP 6-digit 2FA code', hasOutVar: true, defaultRawInput: [{ Key: 'SECRETE_KEY', Value: '' }] },
    ]
  },
  {
    id: 'file_folder',
    name: 'File & Folder',
    count: 18,
    actions: [
      { type: 13, name: 'File exists', category: 'File & Folder', description: 'Check if file exists', hasOutVar: true, defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 14, name: 'Copy file', category: 'File & Folder', description: 'Copy file from source to dest', defaultRawInput: [{ Key: 'SOURCE_FILE', Value: '' }, { Key: 'DES_FILE', Value: '' }] },
      { type: 15, name: 'Move / rename file', category: 'File & Folder', description: 'Move or rename file', defaultRawInput: [{ Key: 'SOURCE_FILE', Value: '' }, { Key: 'DES_FILE', Value: '' }] },
      { type: 16, name: 'Delete file', category: 'File & Folder', description: 'Remove file permanently', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 17, name: 'File read all text', category: 'File & Folder', description: 'Read entire text file', hasOutVar: true, defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 18, name: 'File read all lines', category: 'File & Folder', description: 'Read file lines into array', hasOutVar: true, defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 184, name: 'File read random line', category: 'File & Folder', description: 'Read a random line from file', hasOutVar: true, defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 19, name: 'File write all text', category: 'File & Folder', description: 'Overwrite file with text', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }, { Key: 'TEXT', Value: '' }] },
      { type: 20, name: 'File append line', category: 'File & Folder', description: 'Append line to file', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }, { Key: 'TEXT', Value: '' }] },
      { type: 23, name: 'Folder exists', category: 'File & Folder', description: 'Check if folder exists', hasOutVar: true, defaultRawInput: [{ Key: 'FOLDER_PATH', Value: '' }] },
      { type: 24, name: 'Create folder', category: 'File & Folder', description: 'Create directory recursively', defaultRawInput: [{ Key: 'FOLDER_PATH', Value: '' }] },
      { type: 25, name: 'Delete folder', category: 'File & Folder', description: 'Remove folder and contents', defaultRawInput: [{ Key: 'FOLDER_PATH', Value: '' }] },
      { type: 26, name: 'Move / rename folder', category: 'File & Folder', description: 'Move or rename folder', defaultRawInput: [{ Key: 'SOURCE_FOLDER', Value: '' }, { Key: 'DES_FOLDER', Value: '' }] },
      { type: 72, name: 'Folder get file list', category: 'File & Folder', description: 'List file paths in directory', hasOutVar: true, defaultRawInput: [{ Key: 'FOLDER_PATH', Value: '' }] },
      { type: 74, name: 'Create empty excel', category: 'File & Folder', description: 'Create a blank .xlsx file', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 21, name: 'Read excel file', category: 'File & Folder', description: 'Read cell value from Excel sheet', hasOutVar: true, defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }, { Key: 'SHEET_ID', Value: '' }, { Key: 'COL_NAME_OR_INDEX', Value: '' }, { Key: 'ROW_INDEX', Value: '' }] },
      { type: 22, name: 'Write excel file', category: 'File & Folder', description: 'Write data into Excel cell', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }, { Key: 'SHEET_ID', Value: '' }, { Key: 'COL_NAME_OR_INDEX', Value: '' }, { Key: 'ROW_INDEX', Value: '' }, { Key: 'DATA', Value: '' }] },
      { type: 71, name: 'Append excel file', category: 'File & Folder', description: 'Append row of data into Excel', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }, { Key: 'SHEET_ID', Value: '' }, { Key: 'COL_NAME_OR_INDEX', Value: '' }, { Key: 'DATA', Value: '' }] },
    ]
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    count: 2,
    actions: [
      { type: 27, name: 'Get clipboard text', category: 'Clipboard', description: 'Get OS clipboard text', hasOutVar: true },
      { type: 28, name: 'Set clipboard text', category: 'Clipboard', description: 'Set OS clipboard text', defaultRawInput: [{ Key: 'TEXT', Value: '' }] },
    ]
  },
  {
    id: 'http',
    name: 'HTTP',
    count: 2,
    actions: [
      { type: 29, name: 'HTTP Request', category: 'HTTP', description: 'Perform REST API request (GET/POST/PUT)', hasOutVar: true, defaultRawInput: [{ Key: 'URL', Value: '' }, { Key: 'METHOD', Value: 'GET' }, { Key: 'HEADER', Value: '' }, { Key: 'DATA', Value: '' }, { Key: 'TIMEOUT', Value: '' }, { Key: 'USE_PROFILE_PROXY', Value: 'False' }] },
      { type: 30, name: 'HTTP Download', category: 'HTTP', description: 'Download file from URL', hasOutVar: true, defaultRawInput: [{ Key: 'URL', Value: '' }, { Key: 'SAVE_PATH', Value: '' }, { Key: 'HEADER', Value: '' }] },
    ]
  },
  {
    id: 'image_search',
    name: 'Image search',
    count: 4,
    actions: [
      { type: 107, name: 'Wait to image', category: 'Image search', description: 'Wait until image appears on screen', defaultRawInput: [{ Key: 'IMAGE', Value: '' }, { Key: 'TIMEOUT', Value: '' }, { Key: 'THRESHOLD', Value: '0.7' }, { Key: 'TRUE_COLOR', Value: 'No' }] },
      { type: 108, name: 'Image exists', category: 'Image search', description: 'Check if template image is visible', hasOutVar: true, defaultRawInput: [{ Key: 'IMAGE', Value: '' }, { Key: 'THRESHOLD', Value: '0.7' }, { Key: 'TRUE_COLOR', Value: 'No' }] },
      { type: 109, name: 'Image search', category: 'Image search', description: 'Locate x,y coordinates of image on screen', hasOutVar: true, defaultRawInput: [{ Key: 'IMAGE', Value: '' }, { Key: 'THRESHOLD', Value: '0.7' }, { Key: 'TRUE_COLOR', Value: 'No' }] },
      { type: 110, name: 'Image to Base64', category: 'Image search', description: 'Convert image file to base64 string', hasOutVar: true, defaultRawInput: [{ Key: 'IMAGE_PATH', Value: '' }] },
    ]
  },
  {
    id: 'ai',
    name: 'AI',
    count: 2,
    actions: [
      { type: 34, name: 'Chat GPT', category: 'AI', description: 'Query OpenAI ChatGPT API', hasOutVar: true, defaultRawInput: [{ Key: 'API', Value: '' }, { Key: 'MODEL', Value: 'gpt-4o' }, { Key: 'PROMPT', Value: '' }] },
      { type: 77, name: 'DeepSeek', category: 'AI', description: 'Query DeepSeek Chat API', hasOutVar: true, defaultRawInput: [{ Key: 'API', Value: '' }, { Key: 'MODEL', Value: 'deepseek-chat' }, { Key: 'PROMPT', Value: '' }] },
    ]
  },
  {
    id: 'mail',
    name: 'Mail',
    count: 2,
    actions: [
      { type: 35, name: 'Read mail code', category: 'Mail', description: 'Fetch OTP code from IMAP email', hasOutVar: true, defaultOutVar: 'otp', defaultRawInput: [{ Key: 'USERNAME', Value: '' }, { Key: 'PASSWORD', Value: '' }, { Key: 'MAIL_SERVER', Value: 'imap.gmail.com' }, { Key: 'FROM_CONTAINS', Value: '' }, { Key: 'CODE_TYPE', Value: 'Number' }, { Key: 'CODE_LEN', Value: '6' }, { Key: 'CODE_XPATH', Value: '' }, { Key: 'CODE_ATTR', Value: 'text' }, { Key: 'PROXY', Value: '' }] },
      { type: 80, name: 'Read outlook (Oauth2)', category: 'Mail', description: 'Fetch OTP code via Outlook OAuth2 API', hasOutVar: true, defaultOutVar: 'mailContent', defaultRawInput: [{ Key: 'DATA', Value: '' }, { Key: 'FROM_CONTAINS', Value: '' }, { Key: 'CODE_TYPE', Value: 'Full' }, { Key: 'CODE_LEN', Value: '6' }, { Key: 'CODE_XPATH', Value: '' }, { Key: 'CODE_ATTR', Value: 'text' }, { Key: 'PROXY', Value: '' }] },
    ]
  },
  {
    id: 'browser_nav',
    name: 'Browser - Navigation',
    count: 9,
    actions: [
      { type: 36, name: 'New tab', category: 'Browser - Navigation', description: 'Open a blank browser tab' },
      { type: 37, name: 'Active tab', category: 'Browser - Navigation', description: 'Focus tab by index or prefix url', defaultRawInput: [{ Key: 'ACTIVE_TAB_TYPE', Value: 'By index' }, { Key: 'TAB_INDEX_OR_PREFIX_URL', Value: '' }] },
      { type: 38, name: 'Close tab', category: 'Browser - Navigation', description: 'Close current active tab' },
      { type: 73, name: 'Close all tab', category: 'Browser - Navigation', description: 'Close all other tabs except active' },
      { type: 39, name: 'Go to URL', category: 'Browser - Navigation', description: 'Navigate active tab to web page', defaultRawInput: [{ Key: 'URL', Value: '' }, { Key: 'TIME_OUT', Value: '60' }] },
      { type: 40, name: 'Back URL', category: 'Browser - Navigation', description: 'Go back in history' },
      { type: 41, name: 'Reload', category: 'Browser - Navigation', description: 'Reload the current webpage' },
      { type: 42, name: 'Get URL', category: 'Browser - Navigation', description: 'Retrieve current tab URL', hasOutVar: true },
      { type: 43, name: 'Wait URL Changed', category: 'Browser - Navigation', description: 'Wait until URL changes from current', defaultRawInput: [{ Key: 'CURRENT_URL', Value: '' }, { Key: 'TIME_OUT', Value: '60' }] },
    ]
  },
  {
    id: 'browser_elem',
    name: 'Browser - Element',
    count: 4,
    actions: [
      { type: 44, name: 'Wait element', category: 'Browser - Element', description: 'Wait until element appears in DOM', hasXPath: true, defaultRawInput: [{ Key: 'TIME_OUT', Value: '20' }] },
      { type: 45, name: 'Get element attribute', category: 'Browser - Element', description: 'Read attribute value (href, src, value)', hasXPath: true, hasOutVar: true, defaultRawInput: [{ Key: 'ATTR_NAME', Value: '' }] },
      { type: 46, name: 'Get element text', category: 'Browser - Element', description: 'Extract inner text of element', hasXPath: true, hasOutVar: true },
      { type: 47, name: 'Count element', category: 'Browser - Element', description: 'Count elements matching XPath', hasXPath: true, hasOutVar: true },
    ]
  },
  {
    id: 'browser_mouse',
    name: 'Browser - Mouse',
    count: 6,
    actions: [
      { type: 48, name: 'Mouse click', category: 'Browser - Mouse', description: 'Click element by XPath or screen coordinate', hasXPath: true, defaultRawInput: [{ Key: 'CLICK_TYPE', Value: 'Click by Xpath' }, { Key: 'XPATH', Value: '' }, { Key: 'POS', Value: '' }] },
      { type: 49, name: 'Mouse try to click', category: 'Browser - Mouse', description: 'Try click multiple times until condition met', hasXPath: true, defaultRawInput: [{ Key: 'CLICK_TYPE', Value: 'Click by Xpath' }, { Key: 'XPATH', Value: '' }, { Key: 'POS', Value: '' }, { Key: 'NUMBER_OF_TRIES', Value: '5' }, { Key: 'DELAY_EACH_CLICK', Value: '2' }, { Key: 'STOP_CONDITION', Value: '' }] },
      { type: 50, name: 'Mouse move', category: 'Browser - Mouse', description: 'Move mouse cursor smoothly', hasXPath: true, defaultRawInput: [{ Key: 'MOVE_TYPE', Value: 'Move by Xpath' }, { Key: 'XPATH', Value: '' }, { Key: 'POS', Value: '' }] },
      { type: 51, name: 'Mouse press and hold', category: 'Browser - Mouse', description: 'Hold down mouse button', hasXPath: true, defaultRawInput: [{ Key: 'PRESS_TYPE', Value: 'Press by Xpath' }, { Key: 'XPATH', Value: '' }, { Key: 'POS', Value: '' }] },
      { type: 52, name: 'Mouse release', category: 'Browser - Mouse', description: 'Release held mouse button' },
      { type: 53, name: 'Mouse scroll', category: 'Browser - Mouse', description: 'Scroll page down or up', defaultRawInput: [{ Key: 'SCROLL_NUM', Value: '1' }] },
    ]
  },
  {
    id: 'browser_keyboard',
    name: 'Browser - Keyboard',
    count: 3,
    actions: [
      { type: 54, name: 'Key press', category: 'Browser - Keyboard', description: 'Simulate typing or hotkeys (Enter, Control+A)', hasXPath: true, defaultDelay: '1000,2000', defaultRawInput: [{ Key: 'XPATH', Value: '' }, { Key: 'TYPE', Value: 'Text' }, { Key: 'KEY', Value: '' }, { Key: 'DELAY_PRESS', Value: '-1' }] },
      { type: 55, name: 'File upload', category: 'Browser - Keyboard', description: 'Upload file to file input element', hasXPath: true, defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 111, name: 'Select dropdown', category: 'Browser - Keyboard', description: 'Select option in select HTML element', hasXPath: true, defaultRawInput: [{ Key: 'SELECT_TEXT', Value: '' }] },
    ]
  },
  {
    id: 'browser_scroll',
    name: 'Browser - Scroll',
    count: 4,
    actions: [
      { type: 68, name: 'Execute JS code', category: 'Browser - Scroll', description: 'Execute JavaScript in page context (must return value)', hasOutVar: true, defaultRawInput: [{ Key: 'FILE_OR_CODE', Value: 'return document.title;' }] },
      { type: 57, name: 'Random scroll', category: 'Browser - Scroll', description: 'Natural human-like random scrolling' },
      { type: 58, name: 'Scroll to top', category: 'Browser - Scroll', description: 'Scroll window to top (0,0)' },
      { type: 59, name: 'Scroll to bottom', category: 'Browser - Scroll', description: 'Scroll window to page bottom' },
    ]
  },
  {
    id: 'browser_switch',
    name: 'Browser - Switch',
    count: 3,
    actions: [
      { type: 61, name: 'Switch to default', category: 'Browser - Switch', description: 'Switch context back to main frame' },
      { type: 62, name: 'Switch to frame', category: 'Browser - Switch', description: 'Switch inside iframe by XPath', hasXPath: true },
      { type: 63, name: 'Switch to popup', category: 'Browser - Switch', description: 'Switch context to popup window by title', defaultRawInput: [{ Key: 'TITLE', Value: '' }] },
    ]
  },
  {
    id: 'browser_cookie',
    name: 'Browser - Cookie',
    count: 2,
    actions: [
      { type: 64, name: 'Import cookie', category: 'Browser - Cookie', description: 'Import JSON cookies into browser', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
      { type: 65, name: 'Export cookie', category: 'Browser - Cookie', description: 'Export browser cookies to file', defaultRawInput: [{ Key: 'FILE_PATH', Value: '' }] },
    ]
  },
  {
    id: 'browser_alert',
    name: 'Browser - Alert',
    count: 2,
    actions: [
      { type: 66, name: 'Accept alert', category: 'Browser - Alert', description: 'Accept JavaScript window.alert() or confirm()' },
      { type: 67, name: 'Cancel alert', category: 'Browser - Alert', description: 'Dismiss JavaScript window.confirm()' },
    ]
  },
  {
    id: 'browser_tab_popup',
    name: 'Browser - Tab & Popup',
    count: 2,
    actions: [
      { type: 118, name: 'Wait popup', category: 'Browser - Tab & Popup', description: 'Wait until new popup window opens with title', defaultRawInput: [{ Key: 'TITLE_CONTAINS', Value: '' }, { Key: 'TIMEOUT', Value: '30' }] },
      { type: 119, name: 'Has popup', category: 'Browser - Tab & Popup', description: 'Check if popup window exists', hasOutVar: true, defaultRawInput: [{ Key: 'TITLE_CONTAINS', Value: '' }] },
    ]
  },
];
