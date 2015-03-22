tessel = require('tessel')
q = require 'q'


#promisify

promisify = (fn, thisArg = null) ->
  defer = q.defer()
  callback = (err, data) ->
    return defer.reject(err) if err
    defer.resolve(data)
  fn.apply(thisArg, [callback])
  defer.promise

#acelerometer

accel = require('accel-mma84').use(tessel.port['C']);
get_xyz = ->
  promisify(accel.getAcceleration, accel)

is_moving = (sensitivity = 0.005) ->
  xyz1 = null
  xyz2 = null
  get_xyz()
  .then( (xyz) ->
    xyz1 = xyz
    q.delay(1000).then(-> get_xyz())
  )
  .then( (xyz) ->
    xyz2 = xyz
    diffx = Math.abs(xyz2[0] - xyz1[0])
    diffy = Math.abs(xyz2[1] - xyz1[1])
    diffz = Math.abs(xyz2[2] - xyz1[2])
    if (diffx + diffy + diffz) > sensitivity
      true
    else
      false
  )

# Climate module
climate = require('climate-si7020').use(tessel.port['D'])

get_temp = ->
  promisify(climate.readTemperature, climate)
  
is_burning = (max_temp=30) ->
  get_temp()
  .then( (temp) ->
    console.log temp
    if temp > max_temp
      true
    else
      false
  )

#ambient light and sound
ambient = require('ambient-attx4').use(tessel.port['B']);

get_light_and_sound = ->
  q.all([promisify(ambient.getLightLevel, ambient),promisify(ambient.getSoundLevel, ambient)])

is_light_sound_changing = (light_sensitivity=0.001, sound_sensitivity=0.005) ->
  l1 = null
  l2 = null
  s1 = null
  s2 = null
  get_light_and_sound()
  .then((light_and_sound) ->
    l1 = light_and_sound[0]
    s1 = light_and_sound[1]
    q.delay(1000).then(-> get_light_and_sound())
  )
  .then((light_and_sound) ->
    l2 = light_and_sound[0]
    s2 = light_and_sound[1]
    diffl = Math.abs(l1 - l2)
    diffs = Math.abs(s1 - s2)
    console.log 'diff', diffl, diffs
    if diffl > light_sensitivity || diffs > sound_sensitivity
      true
    else
      false
  )

# Camera
camera = require('camera-vc0706').use(tessel.port['A']);


turn_camera_on = ->
  console.log "Turn Camera On"
  camera_ready_defer = q.defer()
  camera.on('ready', ->
    console.log "Camera On"
    camera_ready_defer.resolve(true)
  )
  return camera_ready_defer.promise


take_a_picutre = ->
  promisify(camera.takePicture, camera)
  .then( (image) ->
    console.log "Image Taken:", image
    name = "picture-#{Date.now()}.jpg"
    console.log('Picture saving as', name, '...');
    process.sendfile(name, image);
    console.log('done.');
  )

# Security Loop
turn_camera_on()
.then( ->
  setInterval( ->
    q.all([is_light_sound_changing(), is_burning(), is_moving()])
    .spread( (lsc, burning, moving) ->
      if lsc or burning or moving
        console.log "Light or Sound Changing" if lsc
        console.log "Burning" if burning
        console.log "Moving" if moving
        take_a_picutre()
      else
        console.log "Nothing is happening"
    )
  , 10000)
)
