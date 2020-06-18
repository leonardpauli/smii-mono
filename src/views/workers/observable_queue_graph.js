/* eslint-disable */
// removed FileAttachment, added viewport (+ named some view used in viewport)


// https://observablehq.com/@leonardpauli/smii-queue-viz@590
export default function define(runtime, observer) {
  const main = runtime.module();
  // const fileAttachments = new Map([["queue.list.ex1.json",null]]);
  // main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], function(md){return(
md`# smii queue viz
*Created by Leonard Pauli, jun 2020*

Visualization of a crawler/fetcher. Most nodes are youtube channels, clustered around their country of origin, with related/featured channels, that the blue "spiders" will go out and fetch more data for (inc. their featured channels, making it go on "forever" (if you hit the "Queue some" button enought)).

Press the "Queue some" button a couple of times, then go into fullscreen and wait a while. If the server is down, change "use_static_data" to true, try also "list_queue_config" to show earlier data.
`
)});
  main.variable(observer("use_static_data")).define("use_static_data", function(){return(
false
)});

  main.variable(observer('viewport')).define('viewport', [
    'html', 'viewof runner', 'dark_mode', 'fullscreen', 'graph', 'graph_ui'
  ], (html, runner, dark_mode, fullscreen, graph, graph_ui)=> {
    return html`${runner} ${dark_mode} ${fullscreen} ${graph} ${graph_ui}`
  })

  main.variable(observer("viewof runner")).define("viewof runner", ["html","md","update_data","ui_reg","invalidation"], function(html,md,update_data,ui_reg,invalidation)
{
  const button = html`<button></button>`
  const span = html`<span style="opacity: 0.5"></span>`
  const span_status = html`<span></span>`
  const el = md`Runner ${span_status} ${span} ${button}`
  const me = {
    check_delay: 500,
    running: false,
    counter: 0,
    async fn () {
      if (!this.running) return
      await this.once()
      setTimeout(()=> this.fn(), this.check_delay)
    },
    async once () {
      this.counter++
      this.span.innerText = this.counter
      // el.dispatchEvent(new CustomEvent('input'))
      await update_data({hover_text_set: t=> ui_reg.hover_text.el.text(t)})
    },
    on_state_change () {
      span_status.innerText = this.running?'active':'paused'
      button.innerText = this.running?'Pause':'Start'
    },
    start () {if (this.running) return; this.running = true; this.on_state_change(); this.fn()},
    stop () {this.running = false; this.on_state_change()},
    toggle (to = !this.running) {to?this.start():this.stop()},
    span,
  }
  invalidation.then(()=> me.stop())
  button.onclick = ()=> me.toggle()
  me.start()
  // me.once()
  el.value = me
  return el
}
);
  main.variable(observer("runner")).define("runner", ["Generators", "viewof runner"], (G, _) => G.input(_));
  main.variable(observer("dark_mode")).define("dark_mode", function(){return(
false
)});
  main.variable(observer("fullscreen")).define("fullscreen", ["html","api","update_data"], function(html,api,update_data)
{
  // https://observablehq.com/@mbostock/fullscreen-canvas
  const button = html`<button>Fullscreen`;
  button.onclick = ()=> {
    const el = button.parentElement.nextElementSibling
    el.requestFullscreen();
    
    el.onclick = async ()=> {
      const res = await api.queue_add_featured({count: 4})
      console.log(res)
      await update_data()
    }
  }
  return button;
}
);
  main.variable(observer("graph")).define("graph", ["width","screen","d3","bg","invalidation","url_open_in_new_tab","update_anim_dur","graph_style","delay"], function(width,screen,d3,bg,invalidation,url_open_in_new_tab,update_anim_dur,graph_style,delay)
{
  const height = Math.ceil(width * screen.height / screen.width)
  
  const svg = d3.create('svg')
    .attr('style', `background-color: ${bg};`)
    .attr('viewBox', [-width/2, -height/2, width, height])
  
  let hover_text_set = t=> {}

  const simulation = d3.forceSimulation()
    .force('link', d3.forceLink() 
      // .distance(d=> d.source.$type==='queued'? 15:d.target.$type==='country'? 60:30)
      // .strength(d=> d.target.$type==='country'? 0.1:1)
     )
    .force('charge', d3.forceManyBody().strength(d=> -20))
    .force('x', d3.forceX().strength(0.04))
    .force('y', d3.forceY().strength(0.04))
    .on('tick', ticked)
  
    
  let link = svg.append('g')
    .selectAll('line')
    
  let node = svg.append('g')
    .selectAll('circle')
  
  
  function ticked() {
    link
      .attr('x1', d=> d.source.x||0)
      .attr('y1', d=> d.source.y||0)
      .attr('x2', d=> d.target.x||0)
      .attr('y2', d=> d.target.y||0)
    
    node
      .attr('cx', d=> d.x||0)
      .attr('cy', d=> d.y||0)
  }

  // terminate on cell re-run
  invalidation.then(()=> simulation.stop())


  function drag (simulation) {
    const drag = d3.drag()
      .on('start', d=> {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', d=> {
        d.fx = d3.event.x
        d.fy = d3.event.y
      })
      .on('end', d=> {
        if (!d3.event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null // snap back?
      })
    return drag
  }

  function node_on_hover (d) {
    if (d.$type === 'channel') {
      hover_text_set(`${d.$type}: ${(d.title || d.slug || d.id)}`)
    } else if (d.$type === 'queued') {
      hover_text_set(`${d.$type}: ${d.status||'added'}`)
    } else {
      hover_text_set(`${d.$type}: ${d.id}`)
    }
  }

  function node_on_click (d) {
    if (d.$type === 'channel') {
      if (d.id) {
        url_open_in_new_tab(`https://youtube.com/channel/${d.id}`)
      } else {
        hover_text_set('(no id)')
      }
    } else {
    }
  }
  
  const t = svg.transition().duration(update_anim_dur)

  async function _update ({nodes, links, ctx: {hover_text_set: _hover_text_set} = {}}) {
    if (_hover_text_set) hover_text_set = _hover_text_set
    
    node = node
      .data(nodes, d=> d.id)
      .join(
        enter=> enter.append('circle')
          .attr('fill', graph_style.node.fill)
          .attr('r', 0)
          .call(enter=> enter.transition(t)
            .attr('r', graph_style.node.r)
            .attr('stroke', graph_style.node.stroke)
            .attr('stroke-width', graph_style.node.stroke_width)
          )
          .call(drag(simulation))
          .on('mouseover', node_on_hover)
          .on('click', node_on_click)
        ,
        update=> update
          .call(update=> update.transition(t)
            .attr('fill', graph_style.node.fill)
            .attr('stroke', graph_style.node.stroke)
            .attr('stroke-width', graph_style.node.stroke_width)
          ),
        exit=> exit
          .call(exit=> exit.transition(t)
            .attr('fill', 'black')
            .attr('r', 0)
            .attr('stroke-width', 0)
            .remove()
          ),
      )

    link = link
      .data(links, d=> d.id)
      .join(
        enter=> enter.append('line')
          .attr('stroke', graph_style.link.stroke)
          .attr('stroke-width', graph_style.link.stroke_width)
          .attr('opacity', 0)
          .call(enter=> enter.transition(t)
            .attr('opacity', 1)
          ),
        update=> update
          .call(update=> update.transition(t)
            .attr('stroke', graph_style.link.stroke)
            .attr('stroke-width', graph_style.link.stroke_width)
          ),
        exit=> exit
          .call(exit=> exit.transition(t)
            .attr('opacity', 0)
            .remove()
          ),
      )

    simulation.nodes(nodes)
    simulation.force('link').links(links)
    simulation.alpha(1).restart()
    
    await delay(update_anim_dur+10)
  }
  
  let updater = null
  let updater_obj_next = null
  async function update (_obj, ctx) {
    const obj = {..._obj, ctx}
    // await current + override next
    if (updater) {
      updater_obj_next = obj
      return updater
    }
    // start new + await
    updater = _update(obj)
    await updater
    updater = null
    
    // start next (in background) if existing
    if (updater_obj_next) {
      const tmp = updater_obj_next
      updater_obj_next = null
      updater = _update(tmp)
      updater.then(()=> {updater = null})
    }
  }

  const ret = svg.node()
  return Object.assign(ret, {
    update,
  })
}
);
  main.variable(observer('graph_ui')).define('graph_ui', ["d3","ui_reg","ui_list"], function(d3,ui_reg,ui_list)
{
  const container = d3.create('div')
    .style('position', 'relative')
  
  ui_reg;
  ui_list.map(o=> container.append(()=> o.el.node()))
  
  return container.node()
}
);
  main.variable(observer("preload")).define("preload", function(){return(
true
)});
  main.variable(observer("ui_reg")).define("ui_reg", ["ui_list_fixer","ui_list"], function(ui_list_fixer,ui_list){return(
ui_list_fixer.fix(ui_list)
)});
  main.variable(observer("ui_list")).define("ui_list", ["api","update_data"], function(api,update_data){return(
[{
  $id: 'hover_text',
  $type: 'text',
}, ...true?[]: [{
  $type: 'button',
  title: 'Add by id',
  on_click: async ()=> {
    const id = window.prompt('Paste channel id:')
    if (!id) return
  },
}], {
  $type: 'button',
  title: 'Queue some',
  on_click: async ()=> {
    const res = await api.queue_add_featured({count: 4})
    console.log(res)
    await update_data()
  },
}, {
  $id: 'update_btn',
  $type: 'button',
  title: 'Update',
  on_click: async ()=> {
    await update_data()
  },
}]
)});
  main.variable(observer()).define(["md"], function(md){return(
md`## Data repo`
)});
  main.variable(observer("graph_data")).define("graph_data", function()
{
const me = ({
  entity: {
    register: {},
    add (k, v) {
      const repo = this.register
      const register = repo[k] || (repo[k] = {})
      const id = v.id
      const existing = register[id]
      if (existing) {
        Object.assign(existing, v)
        me._nodes_add(existing)
        return existing
      }
      const created = register[id] = v
      v.$type = k
      me._nodes_add(created)
      return v
    },
  },
  link_entity: {
    register: {},
    add (source, target, v = {}) {
      const repo = this.register
      const register_id = `${source.$type}__${target.$type}`
      const register = repo[register_id] || (repo[register_id] = {})
      const id = `${source.id}__${target.id}`
      const existing = register[id]
      if (existing) {
        Object.assign(existing, v)
        me._links_add(existing)
        return existing
      }
      const created = register[id] = v
      v.source = source
      v.target = target
      me._links_add(created)
      return v
    },
  },
  
  nodes_set: new Set(),
  links_set: new Set(),
  nodes: [],
  links: [],
  
  reset () {
    this.nodes_set.clear()
    this.links_set.clear()
    this.nodes.splice(0, this.nodes.length)
    this.links.splice(0, this.links.length)
  },
  
  _nodes_add (v) {
    if (me.nodes_set.has(v)) return
    me.nodes_set.add(v)
    me.nodes.push(v)
  },
  _links_add (v) {
    if (me.links_set.has(v)) return
    me.links_set.add(v)
    me.links.push(v)
  },
})
return me  
}
);
  main.variable(observer()).define(["md"], function(md){return(
md`## Update data`
)});
  main.variable(observer("update_data")).define("update_data", ["load_data","graph","graph_data"], function(load_data,graph,graph_data){return(
async (ctx)=> {
  await load_data()
  await graph.update(graph_data, ctx)
}
)});
  main.variable(observer()).define(["md"], function(md){return(
md`## Load data`
)});
  main.variable(observer("load_data")).define("load_data", ["use_static_data","load_data_static","load_data_api"], function(use_static_data,load_data_static,load_data_api){return(
()=> use_static_data?load_data_static():load_data_api()
)});
  main.variable(observer("load_data_static")).define("load_data_static", ["delay","graph_data","graph_data_update_processors","processors_raw_list","graph_data_update_queued","queue_raw_list"], function(delay,graph_data,graph_data_update_processors,processors_raw_list,graph_data_update_queued,queue_raw_list)
{
  let variant = 0
  return async ()=> {
    await delay(200)
    graph_data.reset()
    graph_data_update_processors(processors_raw_list[variant%processors_raw_list.length])
    graph_data_update_queued(queue_raw_list[variant%queue_raw_list.length])
    variant++
  }
}
);
  main.variable(observer("load_data_api")).define("load_data_api", ["api","list_queued_config","graph_data","graph_data_update_processors","graph_data_update_queued"], function(api,list_queued_config,graph_data,graph_data_update_processors,graph_data_update_queued){return(
async ()=> {
  // const [p_raw, q_raw] = await Promise.all([api.list_processors(), api.list_queued()])
  const p_raw = await api.list_processors()
  const q_raw = await api.list_queued(list_queued_config)
  graph_data.reset()
  graph_data_update_processors(p_raw)
  graph_data_update_queued(q_raw)
}
)});
  main.variable(observer("graph_data_update_processors")).define("graph_data_update_processors", ["graph_data"], function(graph_data){return(
(raw)=> {
  const {entity} = graph_data
  raw.forEach(row=> {
    const obj = row.p
    obj.logs = row.logs
    entity.add('processor', obj)
  })
}
)});
  main.variable(observer("graph_data_update_queued")).define("graph_data_update_queued", ["graph_data"], function(graph_data){return(
(raw)=> {
  const {entity, link_entity} = graph_data
  raw.forEach(row=> {
    const queued = entity.add('queued', row.q)
    const channel = row.c && entity.add('channel', row.c)
    const country = row.country? entity.add('country', {id: row.country}): null
    const processor = row.p_id? entity.add('processor', {id: row.p_id}): null

    processor && link_entity.add(processor, queued)
    if ((queued.status || processor) && channel) link_entity.add(queued, channel)
    country && channel && link_entity.add(channel, country)
  })
}
)});
  main.variable(observer()).define(["md"], function(md){return(
md`## Config`
)});
  main.variable(observer("bg")).define("bg", ["dark_mode"], function(dark_mode){return(
dark_mode?'black':'#f4f4f4'
)});
  main.variable(observer("graph_style")).define("graph_style", ["color_with_hue","config_style","dark_mode"], function(color_with_hue,config_style,dark_mode){return(
{
	node: {
		fill: d=> {
	    if (d.$type==='queued') {
	      return d.status==='done'? color_with_hue(0.2)
	        : d.status==='failed'? color_with_hue(0.0)
	        : d.status==='taken'? color_with_hue(0.45)
	        : color_with_hue(0.9)
	    }
	    return (config_style.entity[d.$type] || {}).color || `gray`
	  },
		r: d=> {
	    if (d.$type==='channel' && d.subscriber_count) {
	      return Math.log(d.subscriber_count)/Math.log(10)/2+3
	    }
	    if (d.$type==='processor') {
	      return 10
	    }
	    return 5
	  },
	  stroke: d=> {
	    if (d.$type==='queued' && d.status==='taken') {
	      return '#333'
	    }
	    return '#fff'
	  },
	  stroke_width: d=> {
	    if (d.$type==='queued' && d.status==='taken') {
	      return 2
	    }
	    return dark_mode?0:1
	  },
	},
	link: {
		stroke: dark_mode?'#9b9':'#ccc',
		stroke_width: 1,
	},
}
)});
  main.variable(observer("config_style")).define("config_style", ["color_with_hue"], function(color_with_hue)
{
  const me = {
    entity: {
      processor: {
        color: color_with_hue(0.54),
      },
      queued: {
        color: color_with_hue(0.2),
      },
      channel: {
        color: color_with_hue(0.1),
      },
      country: {
        color: color_with_hue(0.15),
      },
    },
  }
  return me
}
);
  main.variable(observer("update_anim_dur")).define("update_anim_dur", ["use_static_data"], function(use_static_data){return(
use_static_data?2000:400
)});
  main.variable(observer("list_queued_config")).define("list_queued_config", function(){return(
false?({
  count: 5000,
  cutoff_date: new Date('2019-06-15T20:01:17'),
}): ({
  count: 300,
  cutoff_date: new Date(new Date()*1-1000*60*60*2), // new Date("2020-06-15T20:35:43.625Z"),
})
)});
  main.variable(observer()).define(["md"], function(md){return(
md`## Example data`
)});
  main.variable(observer("processors_raw")).define("processors_raw", function(){return(
[
  {
    p: { id: '+uabvRnsCq+KkHMHQ0Rg81eiCgzFjso3iyAj3LUmA3U=' },
    logs: [
      {
        error: null,
        created_at: '2020-06-15T07:04:09.964Z',
        at: 'processor.start'
      },
      {
        error: null,
        created_at: '2020-06-15T07:04:57.401Z',
        at: 'processor.start'
      },
      {
        error: 'yt_api',
        created_at: '2020-06-15T07:06:30.288Z',
        at: 'fetch_import_channel'
      },
      {
        error: 'yt_api',
        created_at: '2020-06-15T07:06:30.466Z',
        at: 'fetch_import_channel'
      },
      {
        error: null,
        created_at: '2020-06-15T07:07:25.512Z',
        at: 'processor.start'
      },
      {
        error: null,
        created_at: '2020-06-15T07:08:45.085Z',
        at: 'processor.start'
      },
      {
        error: null,
        created_at: '2020-06-15T07:15:04.972Z',
        at: 'processor.start'
      }
    ]
  }
]
)});
  main.variable(observer("queued_raw")).define("queued_raw", function(){return(
[
  {
    q: {
      priority: 1,
      id: 'aa43a89d-77e2-41e6-ad6f-23a07fe88960',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '218261f8-de3f-414c-99b0-f0ecf5e7153c',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '019998d5-699a-4d74-8cd2-5957e4ef7d72',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: 'd19bcf2e-0a16-47d3-8bf3-5bfb3cb12037',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: 'd98315e2-9f5c-4405-94f7-65708034a84e',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UClnVDgibuCtsrdzIs0LlGlw',
      fetched_at: '2020-06-15T07:13:58.003Z',
      title: 'JimmyKimmelLiveMusic',
      subscriber_count: 80900,
      slug: null
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '19f61457-a8c5-41de-86ab-1aeeb133a065',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC0vBXGSyV14uvJ4hECDOl0Q',
      fetched_at: '2020-06-15T07:15:21.426Z',
      title: 'Techquickie',
      subscriber_count: 3420000,
      slug: 'techquickie'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '7a067ac4-b247-4df3-9582-e7c67f50a47c',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCt-oJR5teQIjOAxCmIQvcgA',
      fetched_at: '2020-06-15T07:15:21.639Z',
      title: 'Carpool Critics',
      subscriber_count: 30800,
      slug: null
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '568e94fe-06c5-4817-bba4-e84fac41d9a5',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCFLFc8Lpbwt4jPtY1_Ai5yA',
      fetched_at: '2020-06-15T07:15:21.863Z',
      title: 'LMG Clips',
      subscriber_count: 156000,
      slug: 'lmgclips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '4466b4c0-a8d6-41b4-96be-b2e3395916da',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCBZiUUYeLfS5rIj4TQvgSvA',
      fetched_at: '2020-06-15T07:15:24.084Z',
      title: 'Channel Super Fun',
      subscriber_count: 724000,
      slug: 'channelsuperfun'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: 'e1c46684-f7ba-436c-ab32-ddb85674f759',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCeeFfhMcJa1kjtfZAGskOCA',
      fetched_at: '2020-06-15T07:15:24.282Z',
      title: 'TechLinked',
      subscriber_count: 1190000,
      slug: 'techlinked'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '8f76e32f-2d97-4cba-9b73-54503f3295b7',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCdBK94H6oZT2Q7l0-b0xmMg',
      fetched_at: '2020-06-15T07:15:24.531Z',
      title: 'ShortCircuit',
      subscriber_count: 768000,
      slug: 'shortcircuit'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '21d4542b-d356-4d3a-9de0-5ebd93bc2ffb',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: 'ba5a7269-038b-4e78-9e07-5a6a5b613b95',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '2032c996-4f0d-4e90-b6c2-5083d6df71b2',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCBgw11dCV17FJDsHxNGZBtA',
      fetched_at: '2020-06-15T07:16:07.708Z',
      title: 'Killa 87',
      subscriber_count: 218,
      slug: 'realkillachosietemusic'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: 'dec348e0-e06a-4b94-bb6a-fbca31865adf',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC7EtZUBOnrMIoGmkBiLK7jw',
      fetched_at: '2020-06-15T07:17:04.291Z',
      title: 'Thre3Sixty Entertainment',
      subscriber_count: 4650,
      slug: 'thre3sixtyentertainment'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: 'b4e6807f-cc46-469b-82d6-7a0a18752c6e',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCc2fYwucNxW4vvgIhVpBkuA',
      fetched_at: '2020-06-15T07:17:04.529Z',
      title: 'Kelmitt',
      subscriber_count: 56800,
      slug: 'kelmittofficial'
    },
    country: 'PR'
  },
  {
    q: {
      priority: 1,
      id: '7616ee50-b468-48f9-bdcf-f868d686304a',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC1xSgoeSQM3qctxdia9F2eQ',
      fetched_at: '2020-06-15T07:17:04.765Z',
      title: 'The Secret Panda',
      subscriber_count: 105000,
      slug: 'thesecretpanda'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: 'e4f8c61c-8f79-4a69-bd8a-74e8098b0e96',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCg4LCbacLVk-_ks29uTKfrw',
      fetched_at: '2020-06-15T07:17:07.065Z',
      title: 'InnerCat Music Group',
      subscriber_count: 19800,
      slug: 'innercatmusic'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '315f4a6f-3715-4596-a26d-7d37154bdee5',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCDPEgjEPyGjWd2F5AqBcdIA',
      fetched_at: '2020-06-15T07:17:07.344Z',
      title: 'SinfonicoTV',
      subscriber_count: 373000,
      slug: 'sinfonicotv'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '589dc1b4-e299-41ee-b4e0-3b489beccf9a',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCEU5ZK7DwN9ppqPFJiGah3A',
      fetched_at: '2020-06-15T07:17:07.545Z',
      title: 'ElAlfaElJefeTV',
      subscriber_count: 4210000,
      slug: 'elalfaeljefetv'
    },
    country: 'DO'
  },
  {
    q: {
      priority: 1,
      id: '07071ad1-1639-4fe3-b508-cc2cd6ce0c1d',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCqFhfan_P2AmGVB1X2B-3Aw',
      fetched_at: '2020-06-15T07:17:31.924Z',
      title: 'Farruko',
      subscriber_count: 11800000,
      slug: 'farruko'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: 'a4d3dab6-822e-40f3-add0-b98e4e63ee59',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCjbPtDkVYgkuFMGWrXYW1yA',
      fetched_at: '2020-06-15T07:17:32.345Z',
      title: 'Carbon Fiber Music',
      subscriber_count: 2810000,
      slug: 'carbonfibermusic'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '0c7e858e-6010-44a4-a92a-7d358372e644',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCUbZ60eoAgNAiRG7hdPauWA',
      fetched_at: '2020-06-15T07:17:32.52Z',
      title: 'Lary Over',
      subscriber_count: 1830000,
      slug: 'laryover'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '184468f1-37ee-4c90-8dd7-f5f63ce315f4',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC5uqgpXqbc6Agoxv0VDmTWQ',
      fetched_at: '2020-06-15T07:17:34.781Z',
      title: 'Quimico Ultra Mega',
      subscriber_count: 1730000,
      slug: 'quimicoultramega'
    },
    country: 'DO'
  },
  {
    q: {
      priority: 1,
      id: '37e8c78a-2bf3-4f13-8e06-893b09fc13a2',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC9TW4cBLAq0Wpg58kWxq9IQ',
      fetched_at: '2020-06-15T07:17:35.041Z',
      title: 'La Manta',
      subscriber_count: 172000,
      slug: 'lamantatv'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '1ac9b54a-905b-4c5a-a3c9-09a39419ba77',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCFA7pznTq4goDTHtm-u38JA',
      fetched_at: '2020-06-15T07:17:35.268Z',
      title: 'Roke Official',
      subscriber_count: 4420,
      slug: 'rokeofficial'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '1745de1f-dea0-4229-b44a-8467a7807f0d',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC0MIfHbFI2kBVc4eTaF3rBQ',
      fetched_at: '2020-06-15T07:17:37.523Z',
      title: 'Lil Geniuz',
      subscriber_count: 7830,
      slug: null
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '032f11ef-82eb-4e0d-8528-f82de232eca6',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC6oMeyx26_X65E-25ZL06Pw',
      fetched_at: '2020-06-15T07:17:37.733Z',
      title: 'Jehza',
      subscriber_count: 14100,
      slug: null
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '238ff03a-1cf4-4d2d-b4d7-ef55ee9b439d',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UC1A16dAPbDIoWT9wBGihOaQ',
      fetched_at: '2020-06-15T07:17:37.956Z',
      title: 'Ele A El Dominio',
      subscriber_count: 1650000,
      slug: 'eleamusictvoficial'
    },
    country: 'PR'
  },
  {
    q: {
      priority: 1,
      id: '033af253-526c-42d5-8931-8fe02f54f20a',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCS_PolXRglLNVQfa9qb8hhg',
      fetched_at: '2020-06-15T07:17:40.21Z',
      title: 'Real G Music',
      subscriber_count: 332000,
      slug: 'realgmusic'
    },
    country: 'US'
  }
]
)});
  main.variable(observer("queued_raw2")).define("queued_raw2", function(){return(
[
  {
    q: {
      priority: 1,
      id: 'aa43a89d-77e2-41e6-ad6f-23a07fe88960',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '218261f8-de3f-414c-99b0-f0ecf5e7153c',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '019998d5-699a-4d74-8cd2-5957e4ef7d72',
      status: 'taken'
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: 'd19bcf2e-0a16-47d3-8bf3-5bfb3cb12037',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: 'd98315e2-9f5c-4405-94f7-65708034a84e',
      status: null
    },
    p_id: null,
    c: {
      id: 'UClnVDgibuCtsrdzIs0LlGlw',
      fetched_at: '2020-06-15T07:13:58.003Z',
      title: 'JimmyKimmelLiveMusic',
      subscriber_count: 80900,
      slug: null
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '19f61457-a8c5-41de-86ab-1aeeb133a065',
      status: 'taken'
    },
    p_id: '+uabvRnsCq+KkHMHQ0Rg81eiCgzFjso3iyAj3LUmA3U=',
    c: {
      id: 'UC0vBXGSyV14uvJ4hECDOl0Q',
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '7a067ac4-b247-4df3-9582-e7c67f50a47c',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCt-oJR5teQIjOAxCmIQvcgA',
      fetched_at: '2020-06-15T07:15:21.639Z',
      title: 'Carpool Critics',
      subscriber_count: 30800,
      slug: null
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '568e94fe-06c5-4817-bba4-e84fac41d9a5',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCFLFc8Lpbwt4jPtY1_Ai5yA',
      fetched_at: '2020-06-15T07:15:21.863Z',
      title: 'LMG Clips',
      subscriber_count: 156000,
      slug: 'lmgclips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '4466b4c0-a8d6-41b4-96be-b2e3395916da',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCBZiUUYeLfS5rIj4TQvgSvA',
      fetched_at: '2020-06-15T07:15:24.084Z',
      title: 'Channel Super Fun',
      subscriber_count: 724000,
      slug: 'channelsuperfun'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: 'e1c46684-f7ba-436c-ab32-ddb85674f759',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCeeFfhMcJa1kjtfZAGskOCA',
      fetched_at: '2020-06-15T07:15:24.282Z',
      title: 'TechLinked',
      subscriber_count: 1190000,
      slug: 'techlinked'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '8f76e32f-2d97-4cba-9b73-54503f3295b7',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCdBK94H6oZT2Q7l0-b0xmMg',
      fetched_at: '2020-06-15T07:15:24.531Z',
      title: 'ShortCircuit',
      subscriber_count: 768000,
      slug: 'shortcircuit'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '21d4542b-d356-4d3a-9de0-5ebd93bc2ffb',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: 'ba5a7269-038b-4e78-9e07-5a6a5b613b95',
      status: 'taken'
    },
    p_id: '+uabvRnsCq+KkHMHQ0Rg81eiCgzFjso3iyAj3LUmA3U=',
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '2032c996-4f0d-4e90-b6c2-5083d6df71b2',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCBgw11dCV17FJDsHxNGZBtA',
      fetched_at: '2020-06-15T07:16:07.708Z',
      title: 'Killa 87',
      subscriber_count: 218,
      slug: 'realkillachosietemusic'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: 'dec348e0-e06a-4b94-bb6a-fbca31865adf',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC7EtZUBOnrMIoGmkBiLK7jw',
      fetched_at: '2020-06-15T07:17:04.291Z',
      title: 'Thre3Sixty Entertainment',
      subscriber_count: 4650,
      slug: 'thre3sixtyentertainment'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: 'b4e6807f-cc46-469b-82d6-7a0a18752c6e',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCc2fYwucNxW4vvgIhVpBkuA',
      fetched_at: '2020-06-15T07:17:04.529Z',
      title: 'Kelmitt',
      subscriber_count: 56800,
      slug: 'kelmittofficial'
    },
    country: 'PR'
  },
  {
    q: {
      priority: 1,
      id: '7616ee50-b468-48f9-bdcf-f868d686304a',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC1xSgoeSQM3qctxdia9F2eQ',
      fetched_at: '2020-06-15T07:17:04.765Z',
      title: 'The Secret Panda',
      subscriber_count: 105000,
      slug: 'thesecretpanda'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: 'e4f8c61c-8f79-4a69-bd8a-74e8098b0e96',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCg4LCbacLVk-_ks29uTKfrw',
      fetched_at: '2020-06-15T07:17:07.065Z',
      title: 'InnerCat Music Group',
      subscriber_count: 19800,
      slug: 'innercatmusic'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '589dc1b4-e299-41ee-b4e0-3b489beccf9a',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCEU5ZK7DwN9ppqPFJiGah3A',
      fetched_at: '2020-06-15T07:17:07.545Z',
      title: 'ElAlfaElJefeTV',
      subscriber_count: 4210000,
      slug: 'elalfaeljefetv'
    },
    country: 'DO'
  },
  {
    q: {
      priority: 1,
      id: '07071ad1-1639-4fe3-b508-cc2cd6ce0c1d',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCqFhfan_P2AmGVB1X2B-3Aw',
      fetched_at: '2020-06-15T07:17:31.924Z',
      title: 'Farruko',
      subscriber_count: 11800000,
      slug: 'farruko'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: 'a4d3dab6-822e-40f3-add0-b98e4e63ee59',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCjbPtDkVYgkuFMGWrXYW1yA',
      fetched_at: '2020-06-15T07:17:32.345Z',
      title: 'Carbon Fiber Music',
      subscriber_count: 2810000,
      slug: 'carbonfibermusic'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '0c7e858e-6010-44a4-a92a-7d358372e644',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCUbZ60eoAgNAiRG7hdPauWA',
      fetched_at: '2020-06-15T07:17:32.52Z',
      title: 'Lary Over',
      subscriber_count: 1830000,
      slug: 'laryover'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '184468f1-37ee-4c90-8dd7-f5f63ce315f4',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC5uqgpXqbc6Agoxv0VDmTWQ',
      fetched_at: '2020-06-15T07:17:34.781Z',
      title: 'Quimico Ultra Mega',
      subscriber_count: 1730000,
      slug: 'quimicoultramega'
    },
    country: 'DO'
  },
  {
    q: {
      priority: 1,
      id: '37e8c78a-2bf3-4f13-8e06-893b09fc13a2',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC9TW4cBLAq0Wpg58kWxq9IQ',
      fetched_at: '2020-06-15T07:17:35.041Z',
      title: 'La Manta',
      subscriber_count: 172000,
      slug: 'lamantatv'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '1ac9b54a-905b-4c5a-a3c9-09a39419ba77',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCFA7pznTq4goDTHtm-u38JA',
      fetched_at: '2020-06-15T07:17:35.268Z',
      title: 'Roke Official',
      subscriber_count: 4420,
      slug: 'rokeofficial'
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '1745de1f-dea0-4229-b44a-8467a7807f0d',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC0MIfHbFI2kBVc4eTaF3rBQ',
      fetched_at: '2020-06-15T07:17:37.523Z',
      title: 'Lil Geniuz',
      subscriber_count: 7830,
      slug: null
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '032f11ef-82eb-4e0d-8528-f82de232eca6',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC6oMeyx26_X65E-25ZL06Pw',
      fetched_at: '2020-06-15T07:17:37.733Z',
      title: 'Jehza',
      subscriber_count: 14100,
      slug: null
    },
    country: null
  },
  {
    q: {
      priority: 1,
      id: '238ff03a-1cf4-4d2d-b4d7-ef55ee9b439d',
      status: null
    },
    p_id: null,
    c: {
      id: 'UC1A16dAPbDIoWT9wBGihOaQ',
      fetched_at: '2020-06-15T07:17:37.956Z',
      title: 'Ele A El Dominio',
      subscriber_count: 1650000,
      slug: 'eleamusictvoficial'
    },
    country: 'PR'
  },
  {
    q: {
      priority: 1,
      id: '033af253-526c-42d5-8931-8fe02f54f20a',
      status: null
    },
    p_id: null,
    c: {
      id: 'UCS_PolXRglLNVQfa9qb8hhg',
      fetched_at: '2020-06-15T07:17:40.21Z',
      title: 'Real G Music',
      subscriber_count: 332000,
      slug: 'realgmusic'
    },
    country: 'US'
  }
]
)});
  main.variable(observer("queued_raw3")).define("queued_raw3", function(){return(
[
  {
    q: {
      priority: 1,
      id: 'aa43a89d-77e2-41e6-ad6f-23a07fe88960',
      status: null,
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '218261f8-de3f-414c-99b0-f0ecf5e7153c',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
]
)});
  main.variable(observer("queued_raw4")).define("queued_raw4", function(){return(
[
  {
    q: {
      priority: 1,
      id: 'aa43a89d-77e2-41e6-ad6f-23a07fe88960',
      status: 'taken',
    },
    p_id: '+uabvRnsCq+KkHMHQ0Rg81eiCgzFjso3iyAj3LUmA3U=',
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
      fetched_at: '2020-06-15T07:16:06.937Z',
      title: 'Linus Tech Tips',
      subscriber_count: 11100000,
      slug: 'linustechtips'
    },
    country: 'CA'
  },
  {
    q: {
      priority: 1,
      id: '218261f8-de3f-414c-99b0-f0ecf5e7153c',
      status: 'done'
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
      fetched_at: '2020-06-15T07:16:07.474Z',
      title: 'Jimmy Kimmel Live',
      subscriber_count: 16800000,
      slug: 'jimmykimmellive'
    },
    country: 'US'
  },
  {
    q: {
      priority: 1,
      id: '318261f8-de3f-414c-99b0-f0ecf5e7153c',
      status: null,
    },
    p_id: null,
    c: {
      id: 'ACa6vGFO9ty8v5KZJXQxdhaw'
    },
    country: null
  },
]
)});
  main.variable(observer("queued_raw5")).define("queued_raw5", function(){return(
[
  {
    q: {
      priority: 1,
      id: 'aa43a89d-77e2-41e6-ad6f-23a07fe88960',
      status: null,
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
    },
    country: null,
  },
  {
    q: {
      priority: 1,
      id: '218261f8-de3f-414c-99b0-f0ecf5e7153c',
      status: null,
    },
    p_id: null,
    c: {
      id: 'UCa6vGFO9ty8v5KZJXQxdhaw',
    },
    country: null,
  },
]
)});
  main.variable(observer("queued_raw6")).define("queued_raw6", function(){return(
[
  {
    q: {
      priority: 1,
      id: 'aa43a89d-77e2-41e6-ad6f-23a07fe88960',
      status: null,
    },
    p_id: null,
    c: {
      id: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
    },
    country: null,
  },
]
)});
  main.variable(observer("processors_raw_x1")).define("processors_raw_x1", function(){return(
[{"p":{"id":"+uabvRnsCq+KkHMHQ0Rg81eiCgzFjso3iyAj3LUmA3U="},"logs":[{"error":null,"created_at":"2020-06-15T17:33:12.022Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T17:33:15.737Z","at":"fetch_import_channel"},{"error":null,"created_at":"2020-06-15T17:39:02.077Z","at":"processor.start"},{"error":null,"created_at":"2020-06-15T17:57:57.799Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T18:08:59.038Z","at":"fetch_import_channel"},{"error":null,"created_at":"2020-06-15T18:09:13.541Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T18:09:51.898Z","at":"fetch_import_channel"},{"error":"no results","created_at":"2020-06-15T18:09:53.128Z","at":"fetch_import_channel"},{"error":"no results","created_at":"2020-06-15T18:10:04.381Z","at":"fetch_import_channel"},{"error":"no results","created_at":"2020-06-15T18:10:04.657Z","at":"fetch_import_channel"},{"error":null,"created_at":"2020-06-15T19:11:53.993Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T20:49:56.233Z","at":"fetch_import_channel"},{"error":"no results","created_at":"2020-06-15T21:16:35.165Z","at":"fetch_import_channel"},{"error":"no results","created_at":"2020-06-15T21:16:35.277Z","at":"fetch_import_channel"},{"error":null,"created_at":"2020-06-15T21:16:49.501Z","at":"processor.start"}]},{"p":{"id":"GSfM75Jamx7clEMWzLLq3xrOquKxIGcZw9P9sb58dLo="},"logs":[{"error":null,"created_at":"2020-06-15T17:33:12.022Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T17:33:15.737Z","at":"fetch_import_channel"},{"error":null,"created_at":"2020-06-15T17:39:02.077Z","at":"processor.start"},{"error":null,"created_at":"2020-06-15T17:57:57.799Z","at":"processor.start"},{"error":null,"created_at":"2020-06-15T19:11:53.993Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T20:49:56.233Z","at":"fetch_import_channel"},{"error":"no results","created_at":"2020-06-15T21:16:35.277Z","at":"fetch_import_channel"},{"error":null,"created_at":"2020-06-15T21:16:49.501Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T21:19:14.991Z","at":"fetch_import_channel"}]},{"p":{"id":"uu4YmF0w8AS/dPp7m8bPf9rYJBr+djAG2Y8n+M7K5zQ="},"logs":[{"error":null,"created_at":"2020-06-15T17:33:12.022Z","at":"processor.start"},{"error":"no results","created_at":"2020-06-15T17:33:15.737Z","at":"fetch_import_channel"}]}]
)});
  main.variable(observer("queued_raw_x1")).define("queued_raw_x1", ["FileAttachment"], function(FileAttachment){return(
{} || FileAttachment("queue.list.ex1.json").json()
)});
  main.variable(observer("queue_raw_list")).define("queue_raw_list", ["queued_raw","queued_raw2","queued_raw_x1"], function(queued_raw,queued_raw2,queued_raw_x1){return(
[queued_raw, queued_raw2, queued_raw_x1]
)});
  main.variable(observer("processors_raw_list")).define("processors_raw_list", ["processors_raw","processors_raw_x1"], function(processors_raw,processors_raw_x1){return(
[[], processors_raw, processors_raw_x1]
)});
  main.variable(observer()).define(["md"], function(md){return(
md`## API`
)});
  main.variable(observer("api")).define("api", function(){return(
{
  base_url: 'https://smii-dev.leonardpauli.me:4443/api',
  request ({action, payload = {}}) {
    return fetch(this.base_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({action, payload}),
    }).then(res=> res.json())
  },
  list_processors () {return this.request({action: 'queue.viz.processors.list'})},
  list_queued ({
    count = 300,
    cutoff_date = new Date('2020-06-15T20:01:17'),
  } = {}) {return this.request({action: 'queue.viz.queued.list', payload: {
    count, cutoff_date: cutoff_date.toISOString()}})},
  queue_add_featured ({count = 1} = {}) {
    return this.request({action: 'queue.add.channels.featured', payload: {count}})},
  queue_add_many_by_id ({xs = []} = {}) {
    return this.request({action: 'queue.add.channels.by_id_once', payload: {xs}})},
}
)});
  main.variable(observer()).define(["md"], function(md){return(
md`## Utils`
)});
  main.variable(observer("ui_list_fixer")).define("ui_list_fixer", ["d3"], function(d3){return(
{
  types: {
    text: ()=> d3.create('span'),
    button: o=> d3.create('button')
      .text(o.title)
      .on('click', o.on_click),
  },
  fix (xs) {
    xs.slice().reverse().map((o, i)=> {
      const el = this.types[o.$type](o)
      el
        .style('position', 'absolute')
        .style('bottom', `${20+30*i}px`)
        .style('left', '20px')
      o.el = el
      return o
    })
    const reg = Object.fromEntries(xs.filter(o=> o.$id).map(o=> [o.$id, o]))
    return reg
  },
}
)});
  main.variable(observer("url_open_in_new_tab")).define("url_open_in_new_tab", function(){return(
(href)=> {
  Object.assign(document.createElement('a'), {
    target: '_blank',
    href,
  }).click()
}
)});
  main.variable(observer("color_with_hue")).define("color_with_hue", function(){return(
(h, s=0.95, l=0.60)=> `hsl(${h*360}, ${s*100}%, ${l*100}%)`
)});
  main.variable(observer("delay")).define("delay", function(){return(
(ms=0)=> new Promise(r=> setTimeout(r, ms))
)});
  main.variable(observer("d3")).define("d3", ["require"], function(require){return(
require('d3@5')
)});
  return main;
}
