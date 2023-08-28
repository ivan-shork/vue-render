diff只关心新旧节点的子节点都存在一组的情况



```

先遍历最短的，然后去patch，然后再找出多余的，根据情况判断是卸载老节点还是挂载新节点
这种方式在新老节点一一对应都是同个类型的节点下有用，如果顺序打乱的话那就没法复用节点了，会造成卸载然后重新挂载。

let n1Len = n1Child.length
let n2Len = n2Child.length
let i = 0
for(;i<Math.min(n1Len, n2Len); i++) {
    patch(n1Child[i], n2Child[i])
}
const diffLen = Math.abs(n1Len - n2Len)
if(diffLen) {
    for(;i<diffLen; i++) {
        if(n1Len > n2Len) {
            // 有老节点需要卸载
            unmount(n1Child[i])
        } else {
            // 有新节点需要挂载
            patch(null, n2Child[i], el)
        }
    }
}
```


```
简单diff算法核心逻辑：
遍历新的子节点组，利用key去老节点组里找到它对应的索引index，如果找到了，那就称这个为最大索引，并开始patch更新
然后后续遍历过程中如果出现了索引比最大索引小的，证明要移动该节点

如果找不到，则证明有新增的节点，那就执行挂载逻辑

最后在遍历旧节点，找出需要删除的节点并删除

let lastIndex = 0 
for(let i = 0;i<n2Child.length; i++) {
    const newVnode = n2Child[i]
    let find = false
    for(let j = 0;j < n1Child.length; j++) {
        const oldVnode = n1Child[j]
        if(n2Child[i].key === n1Child[j].key) {
            find = true
            patch(oldVnode, newVnode, el)
            if(j < lastIndex) {
                // 说明vnode对应的真实dom需要移动
                const prevVnode = n2Child[i - 1]
                if(prevVnode) {
                    // 找到前一个新的vnode的下一个节点作为猫点，插到它前面去
                    const anchor = prevVnode.el.nextSibling
                    insert(newVnode.el, el, anchor)
                }
            } else {
                lastIndex = j
            }
            break
        }
    }

    // 代表没有找到可以复用的key的新节点，需要进行挂载
    if(!find) {
        const prevVnode = n2Child[i - 1]
        let anchor = null
        if(prevVnode) {
            // 如果有前一个，则挂在前一个后面
            anchor = prevVnode.el.nextSibling
        } else {
            // 证明是第一个
            anchor = el.firstChild
        }
        patch(null, newVnode, el, anchor)
    }
}

// 当更新结束时，我们还需要判断是否有遗留的旧节点需要删除
for(let i = 0; i<n1Child.length; i++) {
    const oldNode = n1Child[i]
    const has = n2Child.find(node => node.key === oldNode.key)
    if(!has) {
        unmount(oldNode)
    }
}
```


```
作用域插槽
<Parent>
 <template #header>
    <h1>我最牛逼</h1>
 </template>
</Parent>

和普通元素vnode的children不一样，组件模版的vnode的children，实际上是一个个插槽函数，
上述的插槽会被转化成

{
    type: Parent, // 组件
    props: {
        ...
    },
    children: {
        header() {
            return {
                type: 'h1',
                props: {},
                children: '我是牛逼'
            }
        }
    }
}

这和react的render props很像

<Parent>
    {
        ({name}) => <div>{name}</div>
    }
</Parent>

而子组件实际上是这样调用的
<div>
    <slot name="header"></slot>
</div>
实际上转为vnode是这样的
{
    type: Parent, // 组件
    props: {
        ...
    },
    children: [
        this.$slots.header()
    ]
}
```



···
vue的很多设计里其实是不是利用了js单线程工作的特点，从而可以收集到当前正在工作的函数或者实例，比如副作用函数首次执行的时候，get函数就可以拿到当前正在执行的副作用函数，又比如getCurrentInstance可以拿到当前运行的组件的实例

----
是的，Vue基于JavaScript单线程的特性实现了其响应式系统和生命周期钩子等特性。在Vue的响应式系统中，通过使用依赖收集/追踪的机制，当某一数据发生变化时，可以精确找到依赖这份数据的地方（例如组件或计算属性），并对其进行更新。这一切都依赖于JavaScript的执行环境是单线程的，这样才能保证在同一时间，系统中只有一个“活动的”计算属性或副作用函数。

此外，Vue 3引入了 Composition API，其中的 getCurrentInstance 方法也利用了 JavaScript 的单线程特性。在 setup 方法执行期间，getCurrentInstance 方法能正确返回当前组件实例，因为在单线程中，在同一时间内 setup 方法一定是属于某个特定组件实例的。这些都得益于 JavaScript 的单线程执行环境，保证了执行上下文的唯一性。
···