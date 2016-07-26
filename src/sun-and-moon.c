#include <pebble.h>

#define INSET 3
#define BG_COLOR GColorBlack;

static Window *s_main_window;
static Layer *s_canvas;
static int sun_angle = -1,
           moon_angle = -1,
           second_angle = -1,
           minute_angle = -1,
           hour_angle = -1;

static int32_t get_angle_for_hour(int hour, int minute) {
  // Progress through 12 hours, out of 360 degrees
  return (((hour * 60) + minute) * 360) / (12 * 60);
}

static int32_t get_angle_for_minute(int minute, int second) {
  // Progress through 60 minutes, out of 360 degrees
  return (((minute * 60) + second) * 360) / (60 * 60);
}

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *data_sun = dict_find(iter, MESSAGE_KEY_SUN_ANGLE);
  if(data_sun) {
    sun_angle = data_sun->value->int32;
    layer_mark_dirty(s_canvas);
  }

  Tuple *data_moon = dict_find(iter, MESSAGE_KEY_MOON_ANGLE);
  if(data_moon) {
    moon_angle = data_moon->value->int32;
    layer_mark_dirty(s_canvas);
  }
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  minute_angle = get_angle_for_minute(tick_time->tm_min, tick_time->tm_sec);
  second_angle = get_angle_for_minute(tick_time->tm_sec, 0);
  hour_angle   = get_angle_for_hour(tick_time->tm_hour, tick_time->tm_min);
  layer_mark_dirty(s_canvas);
}

static void layer_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer); 
  GPoint center = grect_center_point(&bounds);
  GRect frame;
  GPoint pos;

  //Sun
  if(sun_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(16));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(sun_angle-90));
    graphics_context_set_fill_color(ctx, GColorYellow);
    graphics_fill_circle(ctx, pos, 7);
    graphics_context_set_stroke_color(ctx, GColorYellow);
    graphics_draw_line(ctx,center,pos);
  }

  //Moon
  if(moon_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(16));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(moon_angle-90));
    graphics_context_set_fill_color(ctx, GColorWhite);
    graphics_fill_circle(ctx, pos, 6);
    graphics_context_set_stroke_color(ctx, GColorWhite);
    graphics_draw_line(ctx,center,pos);
  }

  //Hour
  if(hour_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(32));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(hour_angle));
    graphics_context_set_fill_color(ctx, GColorGreen);
    graphics_context_set_stroke_width(ctx, 10);
    graphics_context_set_stroke_color(ctx, GColorGreen);
    graphics_draw_line(ctx,center,pos);
  }

  //Minutes
  if(minute_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(32));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(minute_angle));
    graphics_context_set_fill_color(ctx, GColorBlue);
    graphics_context_set_stroke_width(ctx, 6);
    graphics_context_set_stroke_color(ctx, GColorBlue);
    graphics_draw_line(ctx,center,pos);
  }

  //Seconds
  if(second_angle>=0){
    frame = grect_inset(bounds, GEdgeInsets(32));
    pos = gpoint_from_polar(frame, GOvalScaleModeFitCircle, DEG_TO_TRIGANGLE(second_angle));
    graphics_context_set_fill_color(ctx, GColorRed);
    graphics_context_set_stroke_width(ctx, 2);
    graphics_context_set_stroke_color(ctx, GColorRed);
    graphics_draw_line(ctx,center,pos);
  }
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  window_set_background_color(window,GColorBlack);

  s_canvas = layer_create(bounds);
  layer_set_update_proc(s_canvas, layer_update_proc);
  layer_add_child(window_layer, s_canvas);
}

static void window_unload(Window *window) {
  layer_destroy(s_canvas);
}

static void init() {
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(s_main_window, true);

  tick_timer_service_subscribe(SECOND_UNIT, tick_handler);

  app_message_register_inbox_received(inbox_received_handler);
  app_message_open(64, 64);
}

static void deinit() {
  window_destroy(s_main_window);
}

int main() {
  init();
  app_event_loop();
  deinit();
}