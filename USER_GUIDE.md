# RTG Aligned Execution System - User Guide 

## 📖 Table of Contents
1. [Getting Started](#getting-started)
2. [L0 Whiteboard](#l0-whiteboard)
3. [L1 Program Board](#l1-program-board)
4. [L2 Tracks](#l2-tracks)
5. [Executive View](#executive-view)
6. [Data Management](#data-management)
7. [Tips & Best Practices](#tips--best-practices)

## 🚀 Getting Started

### System Overview
The RTG Aligned Execution System is a 4-level program management tool:
- **L0 Whiteboard**: Strategic note-taking and ideation
- **L1 Program Board**: Functional deliverable management
- **L2 Tracks**: Execution tracking and monitoring
- **Executive View**: Analytics and performance dashboard

### Navigation
Use the tabs at the top to move between levels:
`L0 Whiteboard | L1 Program Board | L2 Tracks | Executive View`

## 📝 L0 Whiteboard

### Purpose
Strategic note-taking and idea capture before formal deliverable creation.

### Key Features

#### Creating Notes
1. Click **"Add Note"** or **"Create First Note"**
2. Fill in:
   - **Title**: Brief descriptive name
   - **Description**: Detailed explanation
   - **Tags**: Comma-separated keywords for organization
   - **Stream**: Assign to organizational stream

#### Managing Notes
- **Edit**: Click the note card to modify
- **Delete**: Use the three-dot menu → Delete
- **Search**: Use the search bar to find specific notes
- **Filter**: Use tag filters to view related notes

#### Promoting to L1
1. Select notes using checkboxes
2. Click **"Promote Selected to L1"**
3. Notes become functional deliverables in L1 Program Board
4. Promoted notes are marked and hidden from L0

### Best Practices
- Use descriptive titles for easy identification
- Add relevant tags for better organization
- Promote notes when they're ready for formal tracking

## 📊 L1 Program Board

### Purpose
Manage functional deliverables organized by streams with detailed tracking.

### Key Features

#### Stream Management
- **Create Stream**: Click **"Add Stream"** 
- **Edit Stream**: Use three-dot menu → Edit Name
- **Delete Stream**: Use three-dot menu → Delete Stream
- **Visual Organization**: Each stream has a colored border for easy identification

#### Deliverable Management

##### Creating Deliverables
1. Click **"Add Deliverable"**
2. Fill in:
   - **Title**: Deliverable name
   - **Description**: Detailed description
   - **Stream**: Assign to appropriate stream
   - **Target Date**: Expected completion date
   - **Checklist**: Add task items

##### Deliverable States
- **Planning**: Initial planning phase
- **Alignment**: Stakeholder alignment
- **Executing**: Active work in progress
- **Blocked**: Impediments preventing progress
- **Complete**: Finished deliverable

##### Checklist Management
- **Add Items**: Use "Add Item" button in deliverable modal
- **Check Off**: Click checkboxes to mark items complete (shows strikethrough)
- **Remove Items**: Use trash icon next to each item

#### Visual Organization
- **Active Deliverables**: Shown in main stream area
- **Completed Deliverables**: Automatically moved to "Completed" section at bottom
- **Color Coding**: Each stream has unique colored border
- **Status Badges**: Visual indicators for deliverable states

### Best Practices
- Keep deliverable titles concise but descriptive
- Use checklists to break down complex deliverables
- Update status regularly to maintain accuracy
- Set realistic target dates

## 🎯 L2 Tracks

### Purpose
Monitor execution progress with advanced filtering and performance tracking.

### Key Features

#### Advanced Filtering
Three powerful filters work together:

##### 1. Stream Filter
- **All Streams**: Show all streams
- **Specific Stream**: Filter by individual stream (Networking, Vendors, etc.)

##### 2. Deliverable States Filter
- **All Deliverable States**: Show all states
- **Planning**: Items in planning phase
- **Executing**: Active work items
- **Alignment**: Items needing stakeholder alignment
- **Blocked**: Items with impediments
- **Complete**: Finished items

##### 3. Performance Filter
- **All Performance**: Show all performance levels
- **On Track**: Streams with 75%+ work completion
- **Needs Attention**: Streams with <75% work completion

#### Track Management
- **Outside Track**: Create tracks not tied to specific deliverables
- **Track Details**: View execution progress and metrics
- **Performance Metrics**: Work completion percentages

### Best Practices
- Use filters to focus on specific areas needing attention
- Monitor "Needs Attention" items regularly
- Create outside tracks for work not tied to specific deliverables
- Review performance metrics weekly

## 📈 Executive View

### Purpose
Comprehensive analytics dashboard for program-level insights and decision-making.

### Key Metrics

#### Top-Level Metrics
- **Active Streams**: Number of streams with deliverables
- **Execution Tracks**: Total number of tracks
- **Program Completion**: Overall completion percentage
- **Avg Slip Days**: Average delay from original committed dates

#### Program Health Summary
Visual breakdown showing:
- **Complete**: Number of completed deliverables (green)
- **On Track**: Deliverables without delays (blue)
- **Late**: Deliverables with delays or issues (red)

#### Stream Performance Ranking
Individual stream performance cards showing:
- **Completion Rate**: Percentage of deliverables completed
- **Health Breakdown**: Complete/On Track/Late counts
- **Avg Slip Days**: Average delay for the stream

### Key Insights
- **Performance Tracking**: Identify which streams are delivering on time
- **Risk Identification**: Spot streams needing attention
- **Trend Analysis**: Monitor overall program health
- **Decision Support**: Data-driven insights for leadership

### Best Practices
- Review Executive View weekly for program health
- Focus on streams with high slip days
- Use metrics to guide resource allocation
- Track trends over time for continuous improvement

## 💾 Data Management

### Data Storage
- All data is stored locally in your browser (localStorage)
- Data persists between sessions
- No external servers or databases required

### Data Backup
- Data is automatically saved as you work
- Consider exporting important data periodically
- Browser data can be lost if cache is cleared

### Data Relationships
- **L0 → L1**: Notes can be promoted to deliverables
- **L1 → L2**: Deliverables automatically appear in tracks
- **All Levels → Executive**: Data feeds into analytics dashboard

## 💡 Tips & Best Practices

### General Usage
1. **Start with L0**: Capture ideas and strategic thoughts
2. **Promote Strategically**: Only promote well-defined notes to L1
3. **Maintain Regularly**: Update statuses and progress frequently
4. **Use Filters**: Leverage L2 filters to focus on priorities
5. **Monitor Metrics**: Check Executive View for program health

### Workflow Recommendations
1. **Weekly L0 Review**: Capture new strategic ideas
2. **Daily L1 Updates**: Update deliverable progress and status
3. **Weekly L2 Analysis**: Use filters to identify issues
4. **Monthly Executive Review**: Analyze trends and performance

### Performance Optimization
- **Realistic Dates**: Set achievable target dates
- **Clear Ownership**: Assign clear responsibility for deliverables
- **Regular Updates**: Keep status current for accurate analytics
- **Proactive Management**: Address "Needs Attention" items quickly

### Common Workflows

#### New Initiative Workflow
1. **L0**: Create strategic note with description and tags
2. **L0**: Refine and add details
3. **L0**: Promote to L1 when ready for formal tracking
4. **L1**: Add detailed checklist and target date
5. **L2**: Monitor execution progress
6. **Executive**: Track performance metrics

#### Status Review Workflow
1. **L2**: Filter by "Needs Attention" to identify issues
2. **L1**: Update deliverable status and add notes
3. **L2**: Review outside tracks for additional work
4. **Executive**: Analyze overall program health

## 🆘 Troubleshooting

### Common Issues
- **Data Not Saving**: Check if localStorage is enabled in browser
- **Filters Not Working**: Refresh page and try again
- **Missing Deliverables**: Check if they're in completed section
- **Performance Issues**: Clear browser cache and reload

### Getting Help
1. Check this user guide for detailed instructions
2. Review the README.md for technical information
3. Check browser console for error messages
4. Verify all features are working as expected

---

**Version**: 1.0.0  
**Last Updated**: August 2025

