import { FRAGEMENT_TYPE } from "./const.js"
import { getCurrentInstance, onMounted } from "./instance.js"
import { createRenderer } from "./render/index.js"
import { shouldSetAsProps } from "./utils.js"

const {renderer} = createRenderer({
    createElement(tag) {
        return document.createElement(tag)
    },
    insert(el, parent, anchor = null) {
        parent.insertBefore(el, anchor)
    },
    setElementText(el, txt) {
        el.textContent = txt
    },
    patchProps(el, key, prevValue, nextValue) {
        if(key === 'class') {
            // 特殊处理 dom上是className 并且通过dom properties设置性能最优
            el.className = nextValue
        } else if(/^on/.test(key)) {
            const eveName = key.slice(2).toLowerCase()
            const invoker = el.invoker || (el.invoker = {})
            if(!invoker[eveName]) {
                invoker[eveName] = nextValue
                const _eve = (e) => {
                    invoker[eveName](e)
                }
                el.addEventListener(eveName, _eve)
            } else {
                invoker[eveName] = newValue
            }
        } else if(shouldSetAsProps(key, el)) {
            if(typeof el[key] === 'boolean' && nextValue) {
                el[key] = true
            } else {
                el[key] = nextValue
            }
        } else {
             el.setAttribute(key, nextValue)
        }
    },
    setText(el, text) {
        el.nodeValue = text
    }, 
    createText (text) {
        return document.createTextNode(text)
    }
})

const component = {
    name: 'hhh',
    mounted() {
        console.log('挂载了', this)
        setTimeout(() => {
            this.age.value = '28'
            this.name = 'arya'
        }, 500);
    },
    props: {
        value: 'xxx'
    },
    data() {
        return {
            name: 'aven'
        }
    },
    setup(props, {emit}) {
        console.log(props)
        emit('Click', 'niudie')
        onMounted(()=> {
            const ctx = getCurrentInstance()
            console.log(ctx, 'slots...')
        })
        return {
            age: ref(18)
        }
    },
    render() {
        return {
            type: 'div',
            props: {
                class: 'container'
            },
            children: [
                {
                    type: 'p',
                    key: 1,
                    props: {
                        class: 'txt'
                    },
                    children: this.name + this.age.value
                },
                {
                    type: 'p',
                    key: 2,
                    props: {
                        class: 'txt'
                    },
                    children: this.value
                },
                this.$slots.header()
            ]
        }
    }
}

// 这个其实就是对应的<myComp />
const myComp = {
    type: component,
    props: {
        value: 'hhhh',
        title: '牛逼',
        onClick: () => {
            console.log('click')
        }
    },
    children: {
        header() {
            return {
                type: 'h1',
                children: '我最牛逼'
            }
        }
    }
}

renderer({
    type: FRAGEMENT_TYPE,
    children: [
        myComp,
        {
            type: 'footer',
            children: 'footer'
        }
    ]
}, document.getElementById('app'))
