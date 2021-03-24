const fs = require('fs');
const { EOL } = require('os');

const { info, warn, error } = require('./helpers/logging');
const addImport = require('./helpers/addImport')

let vueVersion = null;


module.exports = (api, options, rootOptions) => {

	// Get Vue version
	vueVersion = Number(rootOptions.vueVersion);

	// Check if Vue is installed
	if (!checkVue(api)) return false;

	// Check if Router is installed
	if (!checkVueRouter(api)) return false;

	// Add Lang Router dependency
	addLangRouter(api);

	api.onCreateComplete(() => {
		// Modify main.js file
		modifyMain(api);

		// Modify router file
		modifyRouter(api, options);

		// Replace <router-link> components with <localized-link>
		if (options.replaceRouterLink) replaceRouterLink(api);

		// Add <language-switcher> component
		if (options.addLanguageSwitcher) addLanguageSwitcher(api);

		// Replace text in About page
		if (options.renderTemplate) replaceAboutText(api);
	});

	// Render the contents of template folder
	if (options.renderTemplate) {
		api.render('./template', {
			...options,
		});
	}
}


// Check if Vue is installed and has supported version
function checkVue() {
	if (vueVersion === 2 || vueVersion === 3) {
		return info(`Installing Language Router for Vue ${vueVersion}.`);
	}
	else if (!vueVersion) {
		return error('Vue is not installed. Run "vue create ." first.');
	}
	else {
		return error(`Detected Vue version ${vueVersion}. Language Router plugin is only compatible with Vue versions 2 & 3. Quitting.`);
	}
}


// Check if Vue Router is installed
function checkVueRouter(api) {
	if (api.generator.pkg.dependencies['vue-router']) return true;
	else return error('Vue Router is not installed. Run "vue add router" first.');
}


// Add Language Router to package.json and download it together with dependencies
function addLangRouter(api) {

	// Language Router semver mapped to Vue major versions
	let versionMap = {
		'2': '^1.3.0',
		'3': '^2.1.0',
	};

	api.extendPackage({
		dependencies: {
			'vue-lang-router': versionMap[vueVersion],
		},
	});
}


// Modify main.js file to import and use I18n
function modifyMain(api) {

	// Determine extension
	const ext = api.hasPlugin('typescript') ? 'ts' : 'js';

	// Get path and file content
	const path = api.resolve(`./src/main.${ext}`);
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return warn('Main file not found, make sure to import i18n manually!');
	}

	// Add import i18n import line
	content = addImport(content, 'i18n', `import { i18n } from 'vue-lang-router'`);

	// Add i18n to Vue
	if (vueVersion === 2) {
		const newVueMatch = content.match(/new Vue.*\(([^\(\)]*|\([\s\S]*\))*\)/)[0];
		const addedI18n = newVueMatch.replace('router,', 'router,' + EOL + 'i18n,')
		content = content.replace(newVueMatch, addedI18n);
	}
	else if (vueVersion === 3) {
		content = content.replace('.use(router)', '.use(router).use(i18n)');
	}

	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}


// Modify router file to import templated stuff and use Language Router instead of Vue Router
function modifyRouter (api, options) {

	// Determine extension
	const ext = api.hasPlugin('typescript') ? 'ts' : 'js';
	
	// Get path and file content
	const path = api.resolve(`./src/router/index.${ext}`);
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return warn('Router file not found, make sure to add Language Router manually.');
	}

	// Add translation & localized URL imports
	if (options.renderTemplate) {
		content = addImport(content, 'translations', `import translations from '../lang/translations'`);
		content = addImport(content, 'localizedURLs', `import localizedURLs from '../lang/localized-urls'`);
	}

	// Change file for Vue specific version
	if (vueVersion === 2) content = modifyRouter_Vue2(content, options);
	else if (vueVersion === 3) content = modifyRouter_Vue3(content, options);

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}


// Make Vue 2 specific changes to router file
function modifyRouter_Vue2 (content, options) {
	
	// Add Language Router import
	content = addImport(content, 'VueRouter', `import LangRouter from 'vue-lang-router'`);

	// Find the Vue.use statement and replace it
	const emptyTranslations = (options.renderTemplate ? '' : ': { /* Provide your translations here */ }');
	const emptyLocalizedURLs = (options.renderTemplate ? '' : ': { /* Provide your localized URLs here (optional) */ }');

	const newStatement =
`Vue.use(LangRouter, {
	defaultLanguage: 'en',
	translations${emptyTranslations},
	localizedURLs${emptyLocalizedURLs},
})`;

	content = content.replace('Vue.use(VueRouter)', newStatement);

	// Find the new VueRouter statement and replace it
	content = content.replace('new VueRouter', 'new LangRouter');

	return content;
}


// Make Vue 3 specific changes to router file
function modifyRouter_Vue3 (content, options) {

	// Add Language Router import
	content = addImport(content, 'createRouter', `import { createLangRouter } from 'vue-lang-router'`);

	// Find createRouter statement and replace it
	const [ createRouterStatement, routerOptions ] = content.match(/const router.+createRouter.*\((([^\(\)]*|\([\s\S]*\))*)\)/);

	const emptyTranslations = (options.renderTemplate ? '' : ': { /* Provide your translations here */ }');
	const emptyLocalizedURLs = (options.renderTemplate ? '' : ': { /* Provide your localized URLs here (optional) */ }');

	const newStatement =
`const langRouterOptions = {
	defaultLanguage: 'en',
	translations${emptyTranslations},
	localizedURLs${emptyLocalizedURLs},
}
const routerOptions = ${routerOptions}
const router = createLangRouter(langRouterOptions, routerOptions)`;

	content = content.replace(createRouterStatement, newStatement);

	return content;
}


// Replace all <router-link> components with <localized-link>
function replaceRouterLink(api) {

	// Get path and file content
	const path = api.resolve('./src/App.vue');
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return warn('App.vue not found, skipping <router-link> replacement.');
	}

	// Skip content: avoid replacing <router-link> inside <language-switcher>
	let skippedContent = content.match(/<language-switcher[\s\S]*?<\/language-switcher>/g);

	if (skippedContent !== null) {
		for (let i = 0, uniqueId; i < skippedContent.length; i++) {
			uniqueId = i + '-' + Date.now();
			content = content.replace(skippedContent[i], uniqueId);
			skippedContent[i] = {
				originalText: skippedContent[i],
				replacement: uniqueId
			};
		}
	}

	// Find the opening <router-link> tag and replace it
	content = content.replace(/<router-link/g, '<localized-link');

	// Find the closing </router-link> tag and replace it
	content = content.replace(/<\/router-link>/g, '<\/localized-link>');

	// Put the skipped content back
	if (skippedContent !== null) {
		for (i = 0; i < skippedContent.length; i++) {
			content = content.replace(skippedContent[i].replacement, skippedContent[i].originalText);
		}
	}

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}


// Add <language-switcher> component to the beginning of #nav in App.vue
function addLanguageSwitcher(api) {

	// Get path and file content
	const path = api.resolve('./src/App.vue');
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return warn('App.vue not found, skipping <language-switcher> example.');
	}

	// The <language-switcher> template
	let languageSwitcher = '';

	if (vueVersion === 2) {
		languageSwitcher = `
		<language-switcher v-slot="{ links }">
			<router-link :to="link.url" v-for="link in links" :key="link.langIndex">
				<span>{{ link.langName }}</span>
			</router-link>
		</language-switcher>`;
	}
	else if (vueVersion === 3) {
		languageSwitcher = `
		<language-switcher v-slot="{ links }" active-class="router-link-exact-active">
			<router-link :to="link.url" v-for="link in links" :key="link.langIndex" :class="link.activeClass" exact-active-class="">
				<span>{{ link.langName }}</span>
			</router-link>
		</language-switcher>`;
	}

	// Insert right after the beginning of <div id="nav">
	if (content.search(/<div.*id="nav".*>/) != -1) {
		content = content.replace(/<div.*id="nav".*>/, '$&' + languageSwitcher);
	}
	// Or insert right after the beginning the first <div> tag
	else {
		content = content.replace(/<div.*>/, '$&' + languageSwitcher);
	}
	
	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}


// Replace text in About page with translations in template
function replaceAboutText(api) {

	// Get path and file content
	const path = api.resolve('./src/views/About.vue');
	let content;
	
	try {
		content = fs.readFileSync(path, { encoding: 'utf-8' });
	} catch (err) {
		return;
	}

	content = content.replace('This is an about page', `{{ $t('about.example') }}`);

	// Replace file
	fs.writeFileSync(path, content, { encoding: 'utf-8' });
}