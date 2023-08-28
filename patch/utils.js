// 操作dom的方法，各个平台不一样

const initFunc = () => {}

let createElement, setElementText, insert, createText, setText, patchProps

// 通过传参设置在当前平台上的操作方法，并且统一暴露出去供后续使用
export const setPaintMethods = (options) => {
    const { createElement: fn1 = initFunc, setElementText: fn2 = initFunc, insert: fn3 = initFunc, createText: fn4 = initFunc, setText: fn5 = initFunc, patchProps: fn6 = initFunc } = options
    createElement = fn1
    setElementText = fn2
    insert = fn3
    createText = fn4
    setText = fn5
    patchProps = fn6
}


export {
    createElement,
    setElementText,
    insert,
    createText,
    setText,
    patchProps
}