# CFML Benchmark Tools

![CFML Benchmark Tools](./images/logo.png)

> Advanced CFML/ColdFusion development tools with intelligent formatting, auto-completion, and code standards for Visual Studio Code.

## ✨ Features

### 🎯 Intelligent Code Formatting

- **Smart indentation** with configurable tab sizes
- **Auto-closing tags** for CFML and HTML elements
- **SQL query formatting** within `<cfquery>` tags
- **Attribute alignment** for better readability

### 💡 Advanced IntelliSense

- **CFML tag completion** with smart snippets
- **Function suggestions** for built-in CFML functions
- **Attribute completion** for CFML tags
- **HTML integration** for mixed CFML/HTML files

### 🔧 Code Validation

- **Variable scoping validation** - warns about unscoped variables
- **Best practices enforcement** - suggests modern CFML patterns
- **Syntax highlighting** with comprehensive CFML grammar

### ⚡ Productivity Features

- **Auto-closing pairs** for tags and brackets
- **Smart indentation** based on tag hierarchy
- **Format on save** option
- **Command palette integration**

## 🚀 Quick Start

### Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "CFML Benchmark Tools"
4. Click Install

### Basic Usage

1. **Open a CFML file** (`.cfm`, `.cfc`, `.cfml`)
2. **Start typing** `<cf` to see intelligent completions
3. **Format your code** using `Ctrl+Shift+P` → "Format CFML Document"
4. **Configure settings** in VS Code Settings → "CFML Benchmark Tools"

## 📝 Code Examples

### Smart Tag Completion

```cfml
<!-- Type: cfif -->
<cfif test="#isDefined('user.id')#">
    <cfoutput>Welcome, #user.name#!</cfoutput>
</cfif>

<!-- Type: cfloop -->
<cfloop array="#products#" index="product">
    <cfoutput>#product.name# - #dollarFormat(product.price)#</cfoutput>
</cfloop>
```

### Formatted Queries

```cfml
<cfquery name="qUsers" datasource="#request.dsn#">
    SELECT
        u.id
        , u.name
        , u.email
        , p.title as profileTitle
    FROM
        users u
        LEFT JOIN profiles p ON u.id = p.user_id
    WHERE
        u.active = <cfqueryparam value="1" cfsqltype="cf_sql_bit" />
        AND u.created_date >= <cfqueryparam value="#dateAdd('d', -30, now())#" cfsqltype="cf_sql_timestamp" />
    ORDER BY
        u.name ASC
</cfquery>
```

### Component Templates

```cfml
<cfcomponent hint="User management component" output="false">

    <cffunction name="init" access="public" returntype="UserService" hint="Constructor">
        <cfset variables.instance = {} />
        <cfreturn this />
    </cffunction>

    <cffunction name="getUser" access="public" returntype="struct" hint="Get user by ID">
        <cfargument name="userID" type="numeric" required="true" hint="User ID" />

        <cfset var local = {} />

        <cfquery name="local.qUser" datasource="#request.dsn#">
            SELECT * FROM users WHERE id = <cfqueryparam value="#arguments.userID#" cfsqltype="cf_sql_integer" />
        </cfquery>

        <cfreturn queryRowToStruct(local.qUser) />
    </cffunction>

</cfcomponent>
```

## ⚙️ Configuration

### Settings

| Setting                              | Default | Description                    |
| ------------------------------------ | ------- | ------------------------------ |
| `cfml.format.indentSize`             | `1`     | Number of tabs for indentation |
| `cfml.format.closeTags`              | `true`  | Auto-close CFML tags           |
| `cfml.format.enforceStandards`       | `true`  | Enforce CFML coding standards  |
| `cfml.completion.enableIntelliSense` | `true`  | Enable CFML IntelliSense       |
| `cfml.validation.variableScoping`    | `true`  | Validate variable scoping      |

### Keyboard Shortcuts

| Shortcut                                | Command                       |
| --------------------------------------- | ----------------------------- |
| `Ctrl+Shift+P` → "Format CFML Document" | Format current CFML file      |
| `<` + trigger                           | Auto-completion for tags      |
| `#`                                     | Expression completion in CFML |

## 🎨 Supported File Types

- `.cfm` - CFML Template files
- `.cfc` - ColdFusion Components
- `.cfml` - CFML files
- Mixed HTML/CFML files

## 🔧 Supported CFML Tags

### Structural Tags

- `cfif`, `cfelseif`, `cfelse`
- `cfloop` (array, query, index)
- `cfswitch`, `cfcase`, `cfdefaultcase`
- `cftry`, `cfcatch`, `cffinally`

### Data Tags

- `cfquery` with SQL formatting
- `cfset`, `cfparam`
- `cfoutput`
- `cfinclude`, `cfimport`

### Object-Oriented

- `cfcomponent`
- `cffunction` with argument validation
- `cfargument`, `cfreturn`

## 💻 Requirements

- Visual Studio Code 1.74.0 or higher
- CFML/ColdFusion development environment (optional)

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/akhil4826/cfml-smart-tools)
- **Email**: akhilteotia19@gmail.com

## 🙏 Acknowledgments

- Thanks to the CFML/ColdFusion community
- Built with ❤️ for CFML developers
- Inspired by modern development tools

---

**Enjoy coding with CFML Benchmark Tools!** 🚀
