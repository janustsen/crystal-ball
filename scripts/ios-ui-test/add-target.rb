# Adds the RitualUITests UI-test target and its own scheme to the generated (gitignored) ios/ project. The target does not
# build the app: it drives whichever Crystal Ball build is installed. Rerun after `npx expo prebuild`; it replaces an existing copy.
require 'xcodeproj'
root=File.expand_path('../..',__dir__)
project=Xcodeproj::Project.open(File.join(root,'ios/CrystalBall.xcodeproj'))
app=project.targets.find{|t|t.name=='CrystalBall'} or abort('Run npx expo prebuild -p ios first.')
project.targets.select{|t|t.name=='RitualUITests'}.each(&:remove_from_project)
project.main_group.children.select{|g|g.display_name=='RitualUITests'}.each(&:remove_from_project)
target=project.new_target(:ui_test_bundle,'RitualUITests',:ios,'16.4')
group=project.main_group.new_group('RitualUITests')
target.add_file_references([group.new_file(File.join(__dir__,'RitualUITests.swift'))])
target.build_configurations.each do |config|
 config.build_settings.merge!('PRODUCT_NAME'=>'RitualUITests','PRODUCT_BUNDLE_IDENTIFIER'=>'com.janustsen.crystalball.RitualUITests','GENERATE_INFOPLIST_FILE'=>'YES','SWIFT_VERSION'=>'5.0','CODE_SIGN_STYLE'=>'Automatic','CODE_SIGN_IDENTITY'=>'-')
end
project.save
scheme=Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.save_as(project.path,'RitualUITests')
puts 'RitualUITests target and scheme added.'
