module.exports = [
	{
		name: 'renderTemplate',
		type: 'confirm',
		message: 'Add example files for language routing?',
		default: true,
	},{
		name: 'rewriteRouterLink',
		type: 'confirm',
		message: 'Rewrite <router-link> to <localized-link> in App.vue?',
		default: true,
	},{
		name: 'addLanguageSwitcher',
		type: 'confirm',
		message: 'Add example <language-switcher> component?',
		default: false,
	},
];