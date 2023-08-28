export const TEXT_TYPE = Symbol('TEXT')
export const COMMENT_TYPE = Symbol('COMMENT')
// 文档类型 用来在模版里可以渲染多个根节点 当mount的时候只需要渲染它的子节点就行了
export const FRAGEMENT_TYPE = Symbol('FRAGEMENT') 
export const vnodeTypeCheck = (type) => ({
    isElement: typeof type === 'string',
    isComp: typeof type === 'object',
    isText: type === TEXT_TYPE,
    isComment: type === COMMENT_TYPE,
    isFragement: type === FRAGEMENT_TYPE
})