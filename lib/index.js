const path = require("path");
const fs = require("fs-extra");

class WepyPluginMovePages {

  /** @type {{config: {root: string, pages: {from: string, to: string, use: boolean}[]}[], isClose: boolean, output: string}} */
  options = {};

  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 插件执行方法
   * @param {{type: IWepyType, code: string, file: string, output: any, next: any, done: any}} data
   * @returns
   */
  apply(data) {

    if (this.options.isClose) {
      data.next();
      return;
    }

    if (!['wxml', 'json', 'wxss', 'wxs', 'js', "page", "config", "css"].includes(data.type)) {
      data.next();
      return;
    }

    if (data.file.includes("dist/app.json")) {
      const newJsonStr = this.modifyAppJson(data.code)

      data.code = newJsonStr

      data.next();
      return;
    }

    /** @type {typeof this.options.config[number]} */
    let subConfig = null;

    /** @type {typeof subConfig.pages[number]} */
    let pageConfg = null;

    this.options.config.forEach((sub) => {
      if (subConfig) {
        return;
      }

      const has = sub.pages.find((item) => item.use && data.file.includes(item.from));

      if (has) {
        subConfig = sub
        pageConfg = has
      }
    })

    if (!subConfig) {
      return data.next();
    }

    const pathObj = path.parse(data.file)
    const newPath = path.join(this.options.output, subConfig.root, `${pageConfg.to}${pathObj.ext}`)

    data.output({
      action: '移动',
      file: newPath
    })

    const code = data.code || fs.readFileSync(data.file).toString()

    fs.outputFileSync(newPath, code)

    data.next();
  }

  modifyAppJson(jsonStr) {

    const json = JSON.parse(jsonStr)

    /** @type {string[]} */
    const pages = json.pages;

    const allFilterPages = [];

    const appSubConfigs = []

    this.options.config.forEach((sub) => {
      const appSubConfig = {
        root: sub.root,
        pages: []
      }

      sub.pages.forEach((item) => {
        if (!item.use) {
          return;
        }
        allFilterPages.push(item.from)
        appSubConfig.pages.push(item.to)
      })

      appSubConfigs.push(appSubConfig)
    })

    const newPages = pages.filter((item) => !allFilterPages.includes(item))

    json.pages = newPages;

    const subPackages = [...(json.subPackages || []), ...(json.subpackages || []), ...appSubConfigs];
    json.subPackages = subPackages;
    delete json.subpackages;
    return JSON.stringify(json)
  }

}

module.exports = WepyPluginMovePages;

