// -*- mode: js2; indent-tabs-mode: nil; js2-basic-offset: 4 -*-
// Load shell theme from ~/.local/share/themes/name/gnome-shell
/* exported init */

const { Gio, GLib, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

const SETTINGS_KEY = 'name';

class ThemeManager {
    constructor() {
        this._settings = ExtensionUtils.getSettings();
    }

    enable() {
        this._changedId = this._settings.connect(`changed::${SETTINGS_KEY}`, this._changeTheme.bind(this));
        this._changeTheme();
    }

    disable() {
        if (this._changedId) {
            this._settings.disconnect(this._changedId);
            this._changedId = 0;
        }

        Main.setThemeStylesheet(null);
        Main.loadTheme();
    }

    _changeTheme() {
        let stylesheet = null;
        let themeName = this._settings.get_string(SETTINGS_KEY);

        if (themeName) {
            let stylesheetPaths = [
                [GLib.get_home_dir(), '.themes'],
                [GLib.get_user_data_dir(), 'themes'],
                ...GLib.get_system_data_dirs().map(dir => [dir, 'themes']),
            ].map(themeDir => GLib.build_filenamev([
                ...themeDir, themeName, 'gnome-shell', 'gnome-shell.css',
            ]));

            stylesheet = stylesheetPaths.find(path => {
                let file = Gio.file_new_for_path(path);
                return file.query_exists(null);
            });
        }

        if (stylesheet)
            global.log(`loading user theme: ${stylesheet}`);
        else
            global.log('loading default theme (Adwaita)');
        Main.setThemeStylesheet(stylesheet);
        this._loadTheme();
    }

    _loadTheme() {
        let myStylesheetPath = GLib.build_filenamev([GLib.get_user_config_dir(), 'gnome-shell', 'gnome-shell.css']);
        let myStylesheet = myStylesheetPath ? Gio.file_new_for_path(myStylesheetPath) : null;

        let themeContext = St.ThemeContext.get_for_stage(global.stage);
        let oldTheme = themeContext.get_theme();

        let theme = new St.Theme({
            application_stylesheet : myStylesheet,
            theme_stylesheet :  Main.getThemeStylesheet(),
            default_stylesheet : Main._getDefaultStylesheet(),
        });

        if (theme.default_stylesheet === null)
            throw new Error("No valid stylesheet found for '%s'".format(Main.sessionMode.stylesheetName));

        if (oldTheme) {
            let customStylesheets = oldTheme.get_custom_stylesheets();
            for (let i = 0; i < customStylesheets.length; i++)
                theme.load_stylesheet(customStylesheets[i]);
        }

        themeContext.set_theme(theme);
    }
}

function init() {
    return new ThemeManager();
}
