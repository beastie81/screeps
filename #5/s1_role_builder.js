var s1_tool    = require('s1_tool');

/* CREEP BODY
MOVE            50
WORK            100
CARRY           50
ATTACK          80
RANGED_ATTACK   150
HEAL            250
CLAIM           600
TOUGH           10
*/

const SPAWN1_ID = 1;

const CREEP_ROLE =
{
    HARVESTER     : 0
   ,RCL_UPGRADER  : 1
   ,BUILDER       : 2
};

/*
  FIND_RESOURCE:  finding resources in any storage
  TO_ENERGY:      moving to resource storage
  TAKE_ENERGY:    take resource
  FIND_REPAIR:    finding structure for repair
  TO_REPAIR:      moving to repairing of a structure
  REPAIR:         repair the structure
  FIND_BUILD:     finding structure for build
  TO_BUILD:       moving to building of a structure
  BUILD:          build the structure
  RECALCULATE:    calculating of actions
*/
const STATE =
{
    FIND_RESOURCE  : 0
   ,TO_ENERGY      : 1
   ,TAKE_ENERGY    : 2
   ,FIND_REPAIR    : 3
   ,TO_REPAIR      : 4
   ,REPAIR         : 5
   ,FIND_BUILD     : 6
   ,TO_BUILD       : 7
   ,BUILD          : 8
   ,RECALCULATE    : 9
};

const BUILDER_STATE =
{
    CREATE             : 0
   ,TO_HARVEST         : 1
   ,HARVEST            : 2
   ,TO_ENERGY          : 3
   ,TAKE_ENERGY        : 4
   ,TO_BUILD           : 5
   ,BUILD              : 6
   ,TO_REPAIR          : 7
   ,REPAIR             : 8
   ,DOING_CALCULATE    : 9
   ,FIND_OBJ_FOR_BUILD : 10
   ,FIND_OBJ_FOR_REPAIR: 11
};

const builder_300_body = [MOVE, WORK, CARRY, CARRY, CARRY];
const builder_500_body = [MOVE, MOVE, WORK,  WORK, CARRY, CARRY, CARRY, CARRY];
const builder_700_body = [MOVE, MOVE, MOVE,  MOVE, MOVE,  WORK,  WORK, CARRY, CARRY, CARRY, CARRY, CARRY];
var   builder_body     = [];

//------------------------------------------------------------------------------
module.exports =
{
    body_calc : function()
    {
        s1_tool.calc_energy();

        builder_body = [];
        if(s1_tool.get_energy() >= 700)
        {
            builder_body   = builder_700_body;
            return;
        }
        if(s1_tool.get_energy() >= 500)
        {
            builder_body   = builder_500_body;
            return;
        }
        if(s1_tool.get_energy() >= 300)
        {
            builder_body   = builder_300_body;
            return;
        }
    },
    //------------------------------------------------------------------------------
    create : function()
    {
        if(Game.spawns.s1.spawning)
            return;

        this.body_calc();

        if(builder_body.length > 0)
        {
            Game.spawns.s1.createCreep(builder_body,
                                       null,
                                      { role       : CREEP_ROLE.BUILDER
                                       ,state      : STATE.FIND_RESOURCE
                                       ,targetID   : null
                                       ,resourceID : null
                                       ,spawnID    : SPAWN1_ID
                                      });
        }
    },
    //------------------------------------------------------------------------------
    doing : function(builder)
    {
      if(builder.spawning)
          return;

      var m = builder.memory;

      switch(m.state)
      {
        case STATE.FIND_RESOURCE:
        {
          var res;

          res = s1_tool.get_stores_with_count_energy(builder.carryCapacity);

          if(res.length > 0)
          {
              m.targetID = res[0].id;
              m.state    = STATE.TO_ENERGY;
              break;
          }
          console.log("Builder(" + builder.name + ")" + " can not find resource storage (" + builder.carryCapacity + ")");
          break;
        }
        case STATE.TO_ENERGY:
        {
          var energy_obj = Game.getObjectById(m.targetID);

          if(builder.pos.inRangeTo(energy_obj, 1))
              m.state = STATE.TAKE_ENERGY;
          else
              builder.moveTo(energy_obj);
          break;
        }
        case STATE.TAKE_ENERGY:
        {
          var energy_obj = Game.getObjectById(m.targetID);
          var res        = builder.withdraw(energy_obj, RESOURCE_ENERGY);

          if(res == ERR_NOT_ENOUGH_RESOURCES)
          {
              m.state  = STATE.FIND_RESOURCE;
              break;
          }

          if(res != OK)
          {
            console.log("Builder(" + builder.name + ")" + " can not take energy(" + res + ")");
            break;
          }

          m.state  = STATE.FIND_REPAIR;
          break;
        }
        case STATE.FIND_REPAIR:
        {
          var res = s1_tool.get_repair_objects();
          if(res.length > 0)
          {
              m.targetID = res[0].id;
              m.state    = STATE.TO_REPAIR;
              break;
          }
          else
            m.state = STATE.FIND_BUILD;
          break;
        }
        case STATE.TO_REPAIR:
        {
          var repair_obj = Game.getObjectById(m.targetID);
          if(repair_obj)
          {
              if(builder.pos.inRangeTo(repair_obj, 3))
                  m.state = STATE.REPAIR;
              else
                  builder.moveTo(repair_obj);
          }
          else
          {
              console.log("S1-BUILDER-STATE.TO_REPAIR - Error!")
          }
          break;
        }
        case STATE.REPAIR:
        {
          var res = builder.repair(Game.getObjectById(m.targetID));

          if(res != OK)
              m.state = STATE.RECALCULATE;
          break;
        }
        case STATE.FIND_BUILD:
        {
          var res = s1_tool.get_build_objects();
          if(res.length > 0)
          {
              m.targetID = res[0].id;
              m.state    = STATE.TO_BUILD;
              break;
          }
          m.state = STATE.RECALCULATE;
          break;
        }
        case STATE.TO_BUILD:
        {
          var build_obj = Game.getObjectById(m.targetID);
          if(build_obj)
          {
              if(builder.pos.inRangeTo(build_obj, 3))
                  m.state = STATE.BUILD;
              else
                  builder.moveTo(build_obj);
          }
          break;
        }
        case STATE.BUILD:
        {
          var res = builder.build(Game.getObjectById(m.targetID));
          if(res != OK)
              m.state = STATE.RECALCULATE;
          break;
        }
        case STATE.RECALCULATE:
        {
          m.state = STATE.FIND_RESOURCE;
          break;
        }
      }
    }
};