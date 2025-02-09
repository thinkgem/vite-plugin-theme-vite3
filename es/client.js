export const globalField = '__VITE_THEME__';
export const styleTagId = '__VITE_PLUGIN_THEME__';
export const darkStyleTagId = '__VITE_PLUGIN_DARK_THEME__';
export const linkID = '__VITE_PLUGIN_THEME-ANTD_DARK_THEME_LINK__';
const colorPluginOutputFileName = __COLOR_PLUGIN_OUTPUT_FILE_NAME__;
const isProd = __PROD__;
const colorPluginOptions = __COLOR_PLUGIN_OPTIONS__;
const injectTo = colorPluginOptions.injectTo;
const debounceThemeRender = debounce(200, renderTheme);
export let darkCssIsReady = false;
(() => {
    if (!window[globalField]) {
        window[globalField] = {
            styleIdMap: new Map(),
            styleRenderQueueMap: new Map(),
        };
    }
    setGlobalOptions('replaceStyleVariables', replaceStyleVariables);
    if (!getGlobalOptions('defaultOptions')) {
        // assign defines
        setGlobalOptions('defaultOptions', colorPluginOptions);
    }
})();
export function addCssToQueue(id, styleString) {
    const styleIdMap = getGlobalOptions('styleIdMap');
    if (!styleIdMap.get(id)) {
        window[globalField].styleRenderQueueMap.set(id, styleString);
        debounceThemeRender();
    }
}
function renderTheme() {
    const variables = getGlobalOptions('colorVariables');
    if (!variables) {
        return;
    }
    const styleRenderQueueMap = getGlobalOptions('styleRenderQueueMap');
    const styleDom = getStyleDom(styleTagId);
    let html = styleDom.innerHTML;
    for (const [id, css] of styleRenderQueueMap.entries()) {
        html += css;
        window[globalField].styleRenderQueueMap.delete(id);
        window[globalField].styleIdMap.set(id, css);
    }
    replaceCssColors(html, variables).then((processCss) => {
        appendCssToDom(styleDom, processCss, injectTo);
    });
}
export async function replaceStyleVariables({ colorVariables, customCssHandler, }) {
    setGlobalOptions('colorVariables', colorVariables);
    const styleIdMap = getGlobalOptions('styleIdMap');
    const styleRenderQueueMap = getGlobalOptions('styleRenderQueueMap');
    if (!isProd) {
        for (const [id, css] of styleIdMap.entries()) {
            styleRenderQueueMap.set(id, css);
        }
        renderTheme();
    }
    else {
        const cssText = await fetchCss(colorPluginOutputFileName);
        const styleDom = getStyleDom(styleTagId);
        const processCss = await replaceCssColors(cssText, colorVariables, customCssHandler);
        appendCssToDom(styleDom, processCss, injectTo);
    }
}
export async function loadDarkThemeCss() {
    const isLoadLink = __ANTD_DARK_PLUGIN_LOAD_LINK__;
    const extractCss = __ANTD_DARK_PLUGIN_EXTRACT_CSS__;
    if (darkCssIsReady || !extractCss) {
        return;
    }
    if (isLoadLink) {
        const linkTag = document.getElementById(linkID);
        if (linkTag) {
            linkTag.removeAttribute('disabled');
            linkTag.setAttribute('rel', 'stylesheet');
        }
    }
    else {
        const cssText = await fetchCss(__ANTD_DARK_PLUGIN_OUTPUT_FILE_NAME__);
        const styleDom = getStyleDom(darkStyleTagId);
        appendCssToDom(styleDom, cssText, injectTo);
    }
    darkCssIsReady = true;
}
// Used to replace css color variables. Note that the order of the two arrays must be the same
export async function replaceCssColors(css, colors, customCssHandler) {
    let retCss = css;
    const defaultOptions = getGlobalOptions('defaultOptions');
    const colorVariables = defaultOptions ? defaultOptions.colorVariables || [] : [];
    colorVariables.forEach(function (color, index) {
        const reg = new RegExp(color.replace(/,/g, ',\\s*').replace(/\s/g, '').replace('(', `\\(`).replace(')', `\\)`) +
            '([\\da-f]{2})?(\\b|\\)|,|\\s)?', 'ig');
        retCss = retCss.replace(reg, colors[index] + '$1$2').replace('$1$2', '');
        if (customCssHandler && typeof customCssHandler === 'function') {
            retCss = customCssHandler(retCss) || retCss;
        }
    });
    return retCss;
}
export function setGlobalOptions(key, value) {
    window[globalField][key] = value;
}
export function getGlobalOptions(key) {
    return window[globalField][key];
}
export function getStyleDom(id) {
    let style = document.getElementById(id);
    if (!style) {
        style = document.createElement('style');
        style.setAttribute('id', id);
    }
    return style;
}
export async function appendCssToDom(styleDom, cssText, appendTo = 'body') {
    styleDom.innerHTML = cssText;
    if (appendTo === 'head') {
        document.head.appendChild(styleDom);
    }
    else if (appendTo === 'body') {
        document.body.appendChild(styleDom);
    }
    else if (appendTo === 'body-prepend') {
        const firstChildren = document.body.firstChild;
        document.body.insertBefore(styleDom, firstChildren);
    }
}
function fetchCss(fileName) {
    return new Promise((resolve, reject) => {
        const append = getGlobalOptions('appended');
        if (append) {
            setGlobalOptions('appended', false);
            resolve('');
            return;
        }
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.responseText);
                }
                else {
                    reject(xhr.status);
                }
            }
        };
        xhr.onerror = function (e) {
            reject(e);
        };
        xhr.ontimeout = function (e) {
            reject(e);
        };
        xhr.open('GET', fileName, true);
        xhr.send();
    });
}
function debounce(delay, fn) {
    let timer;
    return function (...args) {
        // @ts-ignore
        const ctx = this;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(ctx, args);
        }, delay);
    };
}
