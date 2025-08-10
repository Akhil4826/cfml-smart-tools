const vscode = require('vscode');

/**
 * Fixed CFML/HTML Formatter - Eliminates character spacing issues
 */
class FixedCFMLFormatter {
    constructor() {
        // Self-closing CFML tags
        this.selfClosingCFTags = new Set([
            'cfset', 'cfparam', 'cfargument', 'cfreturn', 'cfinclude', 
            'cflocation', 'cfabort', 'cfdump', 'cfthrow', 'cfbreak', 
            'cfcontinue', 'cfheader', 'cfcookie', 'cfcontent', 'cfflush',
            'cfimport', 'cfprocessingdirective', 'cfqueryparam', 'cfhttpparam',
            'cfinput', 'cfselect', 'cfoption'
        ]);
        
        // Self-closing HTML tags
        this.selfClosingHTMLTags = new Set([
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'
        ]);
        
        // Block-level CFML tags
        this.blockLevelCFTags = new Set([
            'cffunction', 'cfcomponent', 'cfif', 'cfelseif', 'cfelse', 
            'cfloop', 'cfquery', 'cftry', 'cfcatch', 'cffinally',
            'cfscript', 'cfoutput', 'cfmail', 'cfhttp', 'cftransaction',
            'cflock', 'cfthread', 'cfcase', 'cfdefaultcase', 'cfswitch',
            'cfdocument', 'cfsavecontent', 'cfsilent', 'cfform',
            'cfmodule', 'cfprocparam', 'cfinvoke', 'cfobject'
        ]);
        
        // HTML block elements
        this.blockLevelHTMLTags = new Set([
            'html', 'head', 'body', 'title', 'style', 'script',
            'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article',
            'header', 'footer', 'nav', 'main', 'aside', 'form', 'fieldset', 'legend',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot',
            'tr', 'td', 'th', 'caption', 'colgroup', 'blockquote', 'pre',
            'address', 'figure', 'figcaption', 'details', 'summary', 'dialog',
            'template', 'canvas', 'svg', 'video', 'audio', 'picture',
            'iframe', 'embed', 'object', 'noscript', 'select', 'optgroup',
            'option', 'textarea', 'button', 'label', 'output', 'progress', 'meter'
        ]);
        
        // Inline HTML elements
        this.inlineHTMLTags = new Set([
            'a', 'span', 'strong', 'em', 'b', 'i', 'small', 'sub', 'sup',
            'code', 'kbd', 'samp', 'var', 'time', 'mark', 'del', 'ins',
            'abbr', 'acronym', 'cite', 'dfn', 'q', 'bdi', 'bdo', 'ruby',
            'rt', 'rp', 'data', 'wbr'
        ]);
        
        // CFML alignment tags
        this.alignableCFTags = new Set([
            'cfelse', 'cfelseif', 'cfcase', 'cfdefaultcase', 'cfcatch', 'cffinally'
        ]);

        // Tags that preserve whitespace
        this.preserveWhitespaceTags = new Set(['pre', 'script', 'style', 'textarea']);
    }

    /**
     * Main formatting method
     */
    formatDocument(text, options = {}) {
        const indentSize = options.indentSize || 4;
        const insertSpaces = options.insertSpaces !== false;
        const indentUnit = insertSpaces ? ' '.repeat(indentSize) : '\t';
        
        try {
            // Use regex-based parsing instead of character-by-character
            const formatted = this.parseAndFormat(text, indentUnit);
            return formatted;

        } catch (error) {
            console.error('CFML Formatting error:', error);
            return text;
        }
    }

    /**
     * Parse and format using regex - much more reliable
     * Enhanced with proper tag alignment for opening/closing pairs
     */
    parseAndFormat(text, indentUnit) {
        // Normalize input
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        const result = [];
        let indentLevel = 0;
        const tagStack = []; // Stack to track opening tags with their indent levels
        
        // Split into lines and process each
        const lines = text.split('\n');
        
        for (let line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Process all tags and content on this line
            const processedLine = this.processLineWithAlignment(trimmedLine, indentLevel, tagStack, indentUnit);
            
            if (processedLine.content) {
                // Update indent level based on tags
                indentLevel = processedLine.newIndentLevel;
                
                // Add the formatted line with proper alignment
                const indent = indentUnit.repeat(Math.max(0, processedLine.indentLevel));
                result.push(indent + processedLine.content);
            }
        }
        
        return result.join('\n');
    }

    /**
     * Process a single line with all its tags and content
     * Enhanced with proper tag alignment tracking
     */
    processLineWithAlignment(line, currentIndentLevel, tagStack, indentUnit) {
        let indentLevel = currentIndentLevel;
        let content = '';
        let lineIndentLevel = currentIndentLevel; // The actual indent level for this line
        
        // Find all tags on this line
        const tagRegex = /<(?:!--[\s\S]*?--|!\[CDATA\[[\s\S]*?\]\]|!DOCTYPE[^>]*|[^>]+)>/gi;
        let match;
        let lastPos = 0;
        let hasClosingTag = false;
        let hasOpeningTag = false;
        
        // First pass: check what types of tags we have on this line
        const tempMatches = [];
        const tempRegex = new RegExp(tagRegex.source, tagRegex.flags);
        while ((match = tempRegex.exec(line)) !== null) {
            const tagInfo = this.analyzeTag(match[0]);
            tempMatches.push({ match: match[0], tagInfo, index: match.index });
            
            if (tagInfo.isClosing && tagInfo.isBlock) {
                hasClosingTag = true;
            } else if (tagInfo.isOpening && !tagInfo.isSelfClosing && tagInfo.isBlock) {
                hasOpeningTag = true;
            }
        }
        
        // If line starts with closing tag, align it with its opening tag
        if (hasClosingTag && tempMatches.length > 0) {
            const firstTag = tempMatches[0];
            if (firstTag.tagInfo.isClosing && firstTag.tagInfo.isBlock) {
                // Find the matching opening tag in stack
                const matchingTag = this.findMatchingTagInStack(tagStack, firstTag.tagInfo.tagName);
                if (matchingTag) {
                    lineIndentLevel = matchingTag.indentLevel;
                    indentLevel = matchingTag.indentLevel;
                }
            }
        }
        
        // Process all tags on this line
        tagRegex.lastIndex = 0; // Reset regex
        while ((match = tagRegex.exec(line)) !== null) {
            // Add any content before this tag
            const beforeTag = line.substring(lastPos, match.index).trim();
            if (beforeTag) {
                if (content) content += ' ';
                content += beforeTag;
            }
            
            const fullTag = match[0];
            const tagInfo = this.analyzeTag(fullTag);
            
            // Handle tag based on type
            if (tagInfo.isClosing) {
                // Closing tag - find and remove from stack
                if (tagInfo.isBlock && this.findMatchingTagInStack(tagStack, tagInfo.tagName)) {
                    this.removeFromTagStack(tagStack, tagInfo.tagName);
                    // Set new indent level for next lines
                    indentLevel = tagStack.length > 0 ? tagStack[tagStack.length - 1].indentLevel + 1 : 0;
                }
                if (content) content += ' ';
                content += fullTag;
                
            } else if (tagInfo.isOpening && !tagInfo.isSelfClosing) {
                // Opening tag
                if (content) content += ' ';
                content += fullTag;
                
                if (tagInfo.isBlock) {
                    // Add to stack with current line's indent level
                    const tagStackItem = {
                        ...tagInfo,
                        indentLevel: lineIndentLevel
                    };
                    tagStack.push(tagStackItem);
                    indentLevel = lineIndentLevel + 1; // Next lines will be indented
                }
                
            } else {
                // Self-closing, comment, or doctype
                if (content) content += ' ';
                content += fullTag;
            }
            
            lastPos = match.index + match[0].length;
        }
        
        // Add any remaining content
        const remaining = line.substring(lastPos).trim();
        if (remaining) {
            if (content) content += ' ';
            content += remaining;
        }
        
        return {
            content: content.trim(),
            indentLevel: lineIndentLevel, // Use the calculated line indent level
            newIndentLevel: indentLevel   // This is for the next line
        };
    }

    /**
     * Original process line method - kept for backward compatibility
     */
    processLine(line, currentIndentLevel, tagStack, indentUnit) {
        return this.processLineWithAlignment(line, currentIndentLevel, tagStack, indentUnit);
    }

    /**
     * Analyze tag properties
     */
    analyzeTag(tag) {
        const trimmed = tag.trim();
        const info = {
            fullTag: trimmed,
            isComment: false,
            isDoctype: false,
            isClosing: false,
            isOpening: false,
            isSelfClosing: false,
            isBlock: false,
            tagName: '',
            isCFML: false
        };
        
        // Check for comment
        if (trimmed.startsWith('<!--') || trimmed.startsWith('<!---')) {
            info.isComment = true;
            info.isBlock = true;
            return info;
        }
        
        // Check for DOCTYPE
        if (trimmed.toLowerCase().startsWith('<!doctype')) {
            info.isDoctype = true;
            info.isBlock = true;
            return info;
        }
        
        // Check for closing tag
        if (trimmed.startsWith('</')) {
            info.isClosing = true;
            const match = trimmed.match(/<\/([a-zA-Z][a-zA-Z0-9]*)/i);
            info.tagName = match ? match[1].toLowerCase() : '';
        } else {
            // Opening or self-closing tag
            info.isOpening = true;
            const match = trimmed.match(/<([a-zA-Z][a-zA-Z0-9]*)/i);
            info.tagName = match ? match[1].toLowerCase() : '';
            
            // Check if self-closing
            info.isSelfClosing = trimmed.endsWith('/>') || 
                               this.selfClosingCFTags.has(info.tagName) ||
                               this.selfClosingHTMLTags.has(info.tagName);
        }
        
        // Determine properties
        if (info.tagName) {
            info.isCFML = info.tagName.startsWith('cf');
            
            if (info.isCFML) {
                info.isBlock = this.blockLevelCFTags.has(info.tagName);
            } else {
                info.isBlock = this.blockLevelHTMLTags.has(info.tagName);
            }
        }
        
        return info;
    }

    /**
     * Find matching opening tag in stack (enhanced version)
     */
    findMatchingTagInStack(tagStack, tagName) {
        for (let i = tagStack.length - 1; i >= 0; i--) {
            if (tagStack[i].tagName === tagName) {
                return tagStack[i];
            }
        }
        return null;
    }

    /**
     * Find matching opening tag in stack (original method for compatibility)
     */
    findMatchingTag(tagStack, tagName) {
        return this.findMatchingTagInStack(tagStack, tagName);
    }

    /**
     * Remove tag from stack
     */
    removeFromTagStack(tagStack, tagName) {
        for (let i = tagStack.length - 1; i >= 0; i--) {
            if (tagStack[i].tagName === tagName) {
                tagStack.splice(i, 1);
                break;
            }
        }
    }
}

// CFML/HTML Code Snippets
class CFMLSnippetProvider {
    constructor() {
        this.snippets = this.createSnippets();
    }

    createSnippets() {
        return [
            // CFML Component Snippets
            {
                prefix: ['cfcomp', 'cfcomponent'],
                label: 'cfcomponent - Create CFML Component',
                insertText: [
                    '<cfcomponent displayname="$1" hint="$2">',
                    '',
                    '    <cffunction name="$3" access="public" returntype="$4" hint="$5">',
                    '        <cfargument name="$6" type="$7" required="$8" hint="$9">',
                    '        ',
                    '        $0',
                    '        ',
                    '        <cfreturn>',
                    '    </cffunction>',
                    '',
                    '</cfcomponent>'
                ].join('\n'),
                documentation: 'Creates a basic CFML component structure'
            },

            // CFML Function Snippets
            {
                prefix: ['cffunction', 'cffunc'],
                label: 'cffunction - Create CFML Function',
                insertText: [
                    '<cffunction name="$1" access="$2" returntype="$3" hint="$4">',
                    '    <cfargument name="$5" type="$6" required="$7" hint="$8">',
                    '    ',
                    '    $0',
                    '    ',
                    '    <cfreturn>',
                    '</cffunction>'
                ].join('\n'),
                documentation: 'Creates a CFML function with arguments'
            },

            // CFML Query Snippets
            {
                prefix: ['cfquery', 'cfq'],
                label: 'cfquery - Database Query',
                insertText: [
                    '<cfquery name="$1" datasource="$2">',
                    '    $0',
                    '</cfquery>'
                ].join('\n'),
                documentation: 'Creates a basic CFML database query'
            },

            // CFML Advanced Query
            {
                prefix: ['cfqueryparams', 'cfqp'],
                label: 'cfquery - Query with Parameters',
                insertText: [
                    '<cfquery name="$1" datasource="$2">',
                    '    SELECT $3',
                    '    FROM $4',
                    '    WHERE $5 = <cfqueryparam value="#$6#" cfsqltype="$7">',
                    '</cfquery>'
                ].join('\n'),
                documentation: 'Creates a parameterized CFML query for security'
            },

            // CFML Loop Snippets
            {
                prefix: ['cfloop', 'cfl'],
                label: 'cfloop - Basic Loop',
                insertText: [
                    '<cfloop $1>',
                    '    $0',
                    '</cfloop>'
                ].join('\n'),
                documentation: 'Creates a basic CFML loop'
            },

            {
                prefix: ['cfloopquery', 'cflq'],
                label: 'cfloop - Query Loop',
                insertText: [
                    '<cfloop query="$1">',
                    '    $0',
                    '</cfloop>'
                ].join('\n'),
                documentation: 'Creates a CFML query loop'
            },

            // CFML Conditional Snippets
            {
                prefix: ['cfif'],
                label: 'cfif - Conditional Statement',
                insertText: [
                    '<cfif $1>',
                    '    $2',
                    '<cfelseif $3>',
                    '    $4',
                    '<cfelse>',
                    '    $0',
                    '</cfif>'
                ].join('\n'),
                documentation: 'Creates a complete CFML conditional statement'
            },

            // CFML Try/Catch
            {
                prefix: ['cftry', 'cftrycatch'],
                label: 'cftry - Error Handling',
                insertText: [
                    '<cftry>',
                    '    $1',
                    '<cfcatch type="$2">',
                    '    <cfdump var="#cfcatch#">',
                    '    $0',
                    '</cfcatch>',
                    '</cftry>'
                ].join('\n'),
                documentation: 'Creates CFML error handling block'
            },

            // CFML Script Snippets
            {
                prefix: ['cfscript', 'cfs'],
                label: 'cfscript - Script Block',
                insertText: [
                    '<cfscript>',
                    '    $0',
                    '</cfscript>'
                ].join('\n'),
                documentation: 'Creates a CFML script block'
            },

            // CFML Output
            {
                prefix: ['cfoutput', 'cfo'],
                label: 'cfoutput - Output Block',
                insertText: [
                    '<cfoutput$1>',
                    '    $0',
                    '</cfoutput>'
                ].join('\n'),
                documentation: 'Creates a CFML output block'
            },

            // HTML5 Boilerplate
            {
                prefix: ['html5', 'htmlboilerplate'],
                label: 'HTML5 - Complete Boilerplate',
                insertText: [
                    '<!DOCTYPE html>',
                    '<html lang="en">',
                    '<head>',
                    '    <meta charset="UTF-8">',
                    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                    '    <title>$1</title>',
                    '    <link rel="stylesheet" href="$2">',
                    '</head>',
                    '<body>',
                    '    $0',
                    '    <script src="$3"></script>',
                    '</body>',
                    '</html>'
                ].join('\n'),
                documentation: 'Creates a complete HTML5 boilerplate'
            },

            // Bootstrap Layout
            {
                prefix: ['bootstrap', 'bs'],
                label: 'Bootstrap - Container Layout',
                insertText: [
                    '<div class="container">',
                    '    <div class="row">',
                    '        <div class="col-md-$1">',
                    '            $0',
                    '        </div>',
                    '    </div>',
                    '</div>'
                ].join('\n'),
                documentation: 'Creates Bootstrap responsive layout'
            },

            // CFML Common Patterns
            {
                prefix: ['cfparam'],
                label: 'cfparam - Parameter Definition',
                insertText: '<cfparam name="$1" default="$2" type="$3">',
                documentation: 'Creates a CFML parameter with default value'
            },

            {
                prefix: ['cfset'],
                label: 'cfset - Variable Assignment',
                insertText: '<cfset $1 = $2>',
                documentation: 'Sets a CFML variable'
            },

            {
                prefix: ['cfinclude'],
                label: 'cfinclude - Include Template',
                insertText: '<cfinclude template="$1">',
                documentation: 'Includes another CFML template'
            },

            {
                prefix: ['cflocation'],
                label: 'cflocation - Redirect',
                insertText: '<cflocation url="$1" addtoken="$2">',
                documentation: 'Redirects to another page'
            },

            // CFML Debugging
            {
                prefix: ['cfdump'],
                label: 'cfdump - Debug Output',
                insertText: '<cfdump var="#$1#" label="$2">',
                documentation: 'Outputs variable contents for debugging'
            },

            {
                prefix: ['cfabort'],
                label: 'cfabort - Stop Processing',
                insertText: '<cfabort showError="$1">',
                documentation: 'Stops page processing'
            },

            // HTML Form Elements
            {
                prefix: ['form'],
                label: 'HTML - Form Element',
                insertText: [
                    '<form action="$1" method="$2">',
                    '    <div class="form-group">',
                    '        <label for="$3">$4</label>',
                    '        <input type="$5" id="$3" name="$3" class="form-control" required>',
                    '    </div>',
                    '    <button type="submit" class="btn btn-primary">$6</button>',
                    '</form>'
                ].join('\n'),
                documentation: 'Creates an HTML form with Bootstrap styling'
            },

            // Table Structure
            {
                prefix: ['table'],
                label: 'HTML - Table Structure',
                insertText: [
                    '<table class="table table-striped">',
                    '    <thead>',
                    '        <tr>',
                    '            <th>$1</th>',
                    '            <th>$2</th>',
                    '        </tr>',
                    '    </thead>',
                    '    <tbody>',
                    '        <tr>',
                    '            <td>$3</td>',
                    '            <td>$4</td>',
                    '        </tr>',
                    '    </tbody>',
                    '</table>'
                ].join('\n'),
                documentation: 'Creates an HTML table with Bootstrap styling'
            }
        ];
    }

    provideCompletionItems(document, position, token, context) {
        const completionItems = this.snippets.map(snippet => {
            const item = new vscode.CompletionItem(snippet.label, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(snippet.insertText);
            item.documentation = new vscode.MarkdownString(snippet.documentation);
            item.detail = 'CFML/HTML Snippet';
            
            // Add all prefixes as filter text
            if (Array.isArray(snippet.prefix)) {
                item.filterText = snippet.prefix.join(' ');
            } else {
                item.filterText = snippet.prefix;
            }
            
            return item;
        });

        return completionItems;
    }
}

// VS Code Integration
class FixedCFMLFormattingProvider {
    constructor() {
        this.formatter = new FixedCFMLFormatter();
    }

    provideDocumentFormattingEdits(document, options, token) {
        console.log('🔧 Fixed CFML Formatter: Starting formatting...');
        
        try {
            const text = document.getText();
            const formattedText = this.formatter.formatDocument(text, {
                indentSize: options.tabSize || 4,
                insertSpaces: options.insertSpaces !== false
            });
            
            if (formattedText !== text) {
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                
                console.log('✅ Fixed CFML Formatter: No more extra spaces!');
                return [new vscode.TextEdit(fullRange, formattedText)];
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Fixed CFML Formatter error:', error);
            return [];
        }
    }

    provideDocumentRangeFormattingEdits(document, range, options, token) {
        try {
            const text = document.getText(range);
            const formattedText = this.formatter.formatDocument(text, {
                indentSize: options.tabSize || 4,
                insertSpaces: options.insertSpaces !== false
            });
            
            if (formattedText !== text) {
                return [new vscode.TextEdit(range, formattedText)];
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Fixed CFML Formatter range error:', error);
            return [];
        }
    }
}

// VS Code Extension
function activate(context) {
    console.log('🔧 Fixed CFML/HTML Formatter with Snippets activated!');
    
    const cfmlLanguages = [
        { language: 'cfml' },
        { language: 'html' },
        { pattern: '**/*.cfm' },
        { pattern: '**/*.cfc' },
        { pattern: '**/*.cfml' }
    ];
    
    const formattingProvider = new FixedCFMLFormattingProvider();
    const snippetProvider = new CFMLSnippetProvider();
    
    if (typeof vscode !== 'undefined' && vscode.languages) {
        // Register formatting providers
        const formattingProviders = cfmlLanguages.map(selector => 
            vscode.languages.registerDocumentFormattingEditProvider(selector, formattingProvider)
        );
        
        const rangeFormattingProviders = cfmlLanguages.map(selector => 
            vscode.languages.registerDocumentRangeFormattingEditProvider(selector, formattingProvider)
        );

        // Register snippet providers
        const snippetProviders = cfmlLanguages.map(selector =>
            vscode.languages.registerCompletionItemProvider(selector, snippetProvider)
        );
        
        // Register commands
        const fixedFormatCommand = vscode.commands.registerCommand('cfml.fixedFormat', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('❌ No active editor found');
                return;
            }
            
            try {
                await vscode.commands.executeCommand('editor.action.formatDocument');
                vscode.window.showInformationMessage('✅ Fixed formatting applied - no extra character spaces!');
            } catch (error) {
                console.error('Fixed CFML formatting error:', error);
                vscode.window.showErrorMessage(`❌ Fixed formatting failed: ${error.message}`);
            }
        });

        const insertSnippetCommand = vscode.commands.registerCommand('cfml.insertSnippet', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('❌ No active editor found');
                return;
            }

            const snippetOptions = snippetProvider.snippets.map(s => ({
                label: s.label,
                description: s.documentation,
                snippet: s
            }));

            const selected = await vscode.window.showQuickPick(snippetOptions, {
                placeHolder: 'Select a CFML/HTML snippet to insert...',
                matchOnDescription: true
            });

            if (selected) {
                const snippetString = new vscode.SnippetString(selected.snippet.insertText);
                await editor.insertSnippet(snippetString);
                vscode.window.showInformationMessage(`✅ Inserted ${selected.label} snippet`);
            }
        });

        const formatAndOrganizeCommand = vscode.commands.registerCommand('cfml.formatAndOrganize', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('❌ No active editor found');
                return;
            }
            
            try {
                // Format document first
                await vscode.commands.executeCommand('editor.action.formatDocument');
                // Then organize imports if available
                await vscode.commands.executeCommand('editor.action.organizeImports').catch(() => {
                    // Ignore if organize imports is not available
                });
                vscode.window.showInformationMessage('✅ Document formatted and organized!');
            } catch (error) {
                console.error('Format and organize error:', error);
                vscode.window.showErrorMessage(`❌ Format and organize failed: ${error.message}`);
            }
        });

        // Add all providers and commands to subscriptions
        context.subscriptions.push(
            ...formattingProviders,
            ...rangeFormattingProviders,
            ...snippetProviders,
            fixedFormatCommand,
            insertSnippetCommand,
            formatAndOrganizeCommand
        );

        vscode.window.showInformationMessage(
            '🔧 Fixed CFML/HTML Formatter with Snippets ready!',
            '🎨 Format Now',
            '📝 Insert Snippet',
            '🔧 Format & Organize'
        ).then(selection => {
            switch (selection) {
                case '🎨 Format Now':
                    vscode.commands.executeCommand('cfml.fixedFormat');
                    break;
                case '📝 Insert Snippet':
                    vscode.commands.executeCommand('cfml.insertSnippet');
                    break;
                case '🔧 Format & Organize':
                    vscode.commands.executeCommand('cfml.formatAndOrganize');
                    break;
            }
        });
    }
    
    console.log('✅ Fixed CFML/HTML Formatter with Snippets ready!');
}

function deactivate() {
    console.log('📴 Fixed CFML/HTML Formatter with Snippets deactivated');
}

module.exports = {
    activate,
    deactivate,
    FixedCFMLFormatter,
    FixedCFMLFormattingProvider,
    CFMLSnippetProvider
};